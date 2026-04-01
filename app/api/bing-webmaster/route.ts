import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BING_API_KEY = process.env.BING_WEBMASTER_API_KEY

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const endpoint = searchParams.get('endpoint')
  const siteUrl = searchParams.get('siteUrl')

  if (!BING_API_KEY) {
    return NextResponse.json({ error: 'Bing Webmaster API not configured' }, { status: 500 })
  }

  if (!endpoint || !siteUrl) {
    return NextResponse.json({ error: 'endpoint and siteUrl required' }, { status: 400 })
  }

  try {
    const cleanUrl = siteUrl.replace(/\/$/, '')
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
  if (!BING_API_KEY) {
    return NextResponse.json({ error: 'Bing Webmaster API not configured' }, { status: 500 })
  }

  try {
    const { endpoint, siteUrl, url } = await req.json()
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
