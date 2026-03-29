import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const accessToken = session.provider_token
    if (!accessToken) return NextResponse.json({ error: 'No Google access token. Please reconnect.' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const siteUrl = searchParams.get('siteUrl')
    const days = parseInt(searchParams.get('days') || '30')
    if (!siteUrl) return NextResponse.json({ error: 'siteUrl required' }, { status: 400 })

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const fmt = (d: Date) => d.toISOString().split('T')[0]

    const headers = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    const baseUrl = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`

    const [overviewRes, pagesRes, keywordsRes] = await Promise.all([
      fetch(baseUrl, { method: 'POST', headers, body: JSON.stringify({ startDate: fmt(startDate), endDate: fmt(endDate), dimensions: ['date'], rowLimit: 90 }) }),
      fetch(baseUrl, { method: 'POST', headers, body: JSON.stringify({ startDate: fmt(startDate), endDate: fmt(endDate), dimensions: ['page'], rowLimit: 15 }) }),
      fetch(baseUrl, { method: 'POST', headers, body: JSON.stringify({ startDate: fmt(startDate), endDate: fmt(endDate), dimensions: ['query'], rowLimit: 25 }) }),
    ])

    if (!overviewRes.ok) {
      const err = await overviewRes.json()
      throw new Error(err.error?.message || 'Search Console API error')
    }

    const [overview, pages, keywords] = await Promise.all([overviewRes.json(), pagesRes.json(), keywordsRes.json()])

    const rows = overview.rows || []
    const totals = rows.reduce((acc: any, row: any) => ({
      clicks: acc.clicks + row.clicks,
      impressions: acc.impressions + row.impressions,
      ctr: acc.ctr + row.ctr,
      position: acc.position + row.position,
    }), { clicks: 0, impressions: 0, ctr: 0, position: 0 })

    return NextResponse.json({
      totals: {
        clicks: Math.round(totals.clicks),
        impressions: Math.round(totals.impressions),
        ctr: rows.length ? (totals.ctr / rows.length * 100).toFixed(1) : '0',
        position: rows.length ? (totals.position / rows.length).toFixed(1) : '0',
      },
      daily: rows.map((r: any) => ({ date: r.keys[0], clicks: r.clicks, impressions: r.impressions })),
      pages: (pages.rows || []).map((r: any) => ({ page: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: (r.ctr * 100).toFixed(1), position: r.position.toFixed(1) })),
      keywords: (keywords.rows || []).map((r: any) => ({ keyword: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: (r.ctr * 100).toFixed(1), position: r.position.toFixed(1) })),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
