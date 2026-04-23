import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

async function resolveBingKey(siteId?: string | null): Promise<string | null> {
  if (siteId) {
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: site } = await supabase.from('sites')
        .select('user_id, bing_api_key').eq('id', siteId).single()
      if (site && site.user_id === user.id && site.bing_api_key) return site.bing_api_key
    }
  }
  return process.env.BING_WEBMASTER_API_KEY || null
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const endpoint = searchParams.get('endpoint')
  const siteUrl = searchParams.get('siteUrl')
  const siteId = searchParams.get('siteId')

  const BING_API_KEY = await resolveBingKey(siteId)
  if (!BING_API_KEY) {
    return NextResponse.json({ error: 'Bing Webmaster API key not set for this site. Add it in site settings.' }, { status: 400 })
  }

  if (!endpoint) {
    return NextResponse.json({ error: 'endpoint required' }, { status: 400 })
  }
  if (endpoint !== 'sites' && !siteUrl) {
    return NextResponse.json({ error: 'siteUrl required' }, { status: 400 })
  }

  try {
    const cleanUrl = (siteUrl || '').replace(/\/$/, '')
    let apiUrl = ''

    switch (endpoint) {
      case 'crawl-stats':
        apiUrl = `https://ssl.bing.com/webmaster/api.svc/json/GetCrawlStats?apikey=${BING_API_KEY}&siteUrl=${encodeURIComponent(cleanUrl)}`
        break
      case 'keywords':
        apiUrl = `https://ssl.bing.com/webmaster/api.svc/json/GetKeywordStats?apikey=${BING_API_KEY}&siteUrl=${encodeURIComponent(cleanUrl)}&query=&country=US&language=en-US`
        break
      case 'crawl-issues':
        apiUrl = `https://ssl.bing.com/webmaster/api.svc/json/GetCrawlIssues?apikey=${BING_API_KEY}&siteUrl=${encodeURIComponent(cleanUrl)}`
        break
      case 'sites':
        apiUrl = `https://ssl.bing.com/webmaster/api.svc/json/GetUserSites?apikey=${BING_API_KEY}`
        break
      default:
        return NextResponse.json({ error: 'Unknown endpoint' }, { status: 400 })
    }

    const res = await fetch(apiUrl)

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `Bing API error: ${res.status}`, details: err }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { endpoint, siteUrl, url, siteId } = await req.json()
    const BING_API_KEY = await resolveBingKey(siteId)
    if (!BING_API_KEY) {
      return NextResponse.json({ error: 'Bing Webmaster API key not set for this site. Add it in site settings.' }, { status: 400 })
    }
    const cleanSiteUrl = siteUrl?.replace(/\/$/, '')

    if (endpoint === 'submit-url') {
      const res = await fetch(`https://ssl.bing.com/webmaster/api.svc/json/SubmitUrl?apikey=${BING_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ siteUrl: cleanSiteUrl, url }),
      })
      if (!res.ok) {
        const err = await res.text()
        return NextResponse.json({ error: `Bing API error: ${res.status}`, details: err }, { status: res.status })
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown endpoint' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
