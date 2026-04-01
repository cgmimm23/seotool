import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const accessToken = session.provider_token
    if (!accessToken) return NextResponse.json({ error: 'No Google access token. Please reconnect Google.' }, { status: 401 })

    const { siteUrl, siteId, days = 90 } = await request.json()
    if (!siteUrl || !siteId) return NextResponse.json({ error: 'siteUrl and siteId required' }, { status: 400 })

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const fmt = (d: Date) => d.toISOString().split('T')[0]

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }

    const baseUrl = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`

    // Fetch keyword + date data for rank history (group by query + date)
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        startDate: fmt(startDate),
        endDate: fmt(endDate),
        dimensions: ['query', 'date'],
        rowLimit: 1000,
        dataState: 'all',
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error?.message || 'Search Console API error')
    }

    const data = await res.json()
    const rows = data.rows || []

    if (rows.length === 0) {
      return NextResponse.json({ synced: 0, message: 'No data returned from Search Console.' })
    }

    // Get or create keywords in the keywords table
    const uniqueKeywords = [...new Set(rows.map((r: any) => r.keys[0]))] as string[]

    // Upsert keywords
    const keywordUpserts = uniqueKeywords.map(kw => ({
      site_id: siteId,
      user_id: session.user.id,
      keyword: kw,
      page_path: '/',
    }))

    await supabase.from('keywords').upsert(keywordUpserts, { onConflict: 'site_id,page_path,keyword', ignoreDuplicates: true })

    // Fetch all keywords for this site to get their IDs
    const { data: kwData } = await supabase
      .from('keywords')
      .select('id, keyword')
      .eq('site_id', siteId)
      .eq('user_id', session.user.id)

    const kwMap: Record<string, string> = {}
    for (const kw of kwData || []) kwMap[kw.keyword] = kw.id

    // Build serp_rankings inserts
    const rankings = rows
      .map((r: any) => {
        const keyword = r.keys[0]
        const date = r.keys[1]
        const kwId = kwMap[keyword]
        if (!kwId) return null
        return {
          keyword_id: kwId,
          user_id: session.user.id,
          position: Math.round(r.position),
          previous_position: null,
          source: 'gsc',
          checked_at: new Date(date).toISOString(),
        }
      })
      .filter(Boolean)

    // Insert in batches of 500
    let synced = 0
    for (let i = 0; i < rankings.length; i += 500) {
      const batch = rankings.slice(i, i + 500)
      const { error } = await (supabase as any)
        .from('serp_rankings')
        .upsert(batch, { onConflict: 'keyword_id,source,checked_at', ignoreDuplicates: true })
      if (!error) synced += batch.length
    }

    return NextResponse.json({ synced, total: rows.length, message: `Synced ${synced} ranking data points from Search Console.` })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
