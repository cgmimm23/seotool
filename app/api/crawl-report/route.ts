import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { url, pages, summary } = await request.json()
    if (!url || !pages) return NextResponse.json({ error: 'Missing data' }, { status: 400 })

    const cleanUrl = url.replace(/^https?:\/\//, '').split('/')[0]
    const baseUrl = url.startsWith('http') ? url.split('/').slice(0, 3).join('/') : 'https://' + cleanUrl

    let siteId: string | null = null
    const { data: existing } = await supabase.from('sites').select('id').eq('user_id', user.id).ilike('url', '%' + cleanUrl + '%').limit(1).single()
    if (existing) {
      siteId = existing.id
    } else {
      const { data: newSite } = await supabase.from('sites').insert({ user_id: user.id, url: baseUrl, name: cleanUrl, active: true }).select().single()
      if (newSite) siteId = newSite.id
    }

    const totalIssues = pages.reduce((a: number, p: any) => a + (p.issues?.length || 0), 0)
    const errorPages = pages.filter((p: any) => p.status >= 400).length
    const cleanPages = pages.filter((p: any) => p.issues?.length === 0 && p.status < 400).length

    const { data, error } = await supabase.from('crawl_reports').insert({
      site_id: siteId, user_id: user.id, url: baseUrl,
      pages_crawled: pages.length, total_issues: totalIssues,
      error_pages: errorPages, clean_pages: cleanPages, pages, summary: summary || null,
    }).select().single()

    if (error) throw error
    return NextResponse.json({ report: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')
    const full = searchParams.get('full')

    let query = supabase.from('crawl_reports')
      .select(full ? '*' : 'id, url, pages_crawled, total_issues, error_pages, clean_pages, summary, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (siteId) query = query.eq('site_id', siteId)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ reports: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
