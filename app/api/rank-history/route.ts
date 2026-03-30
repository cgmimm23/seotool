import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('siteId')
  const days = parseInt(searchParams.get('days') || '30')

  if (!siteId) {
    return NextResponse.json({ error: 'siteId param required' }, { status: 400 })
  }

  const since = new Date()
  since.setDate(since.getDate() - days)

  // Get all keywords for this site
  const { data: keywords, error: kwError } = await supabase
    .from('keywords')
    .select('id, keyword')
    .eq('site_id', siteId)

  if (kwError) {
    return NextResponse.json({ error: kwError.message }, { status: 500 })
  }

  if (!keywords || keywords.length === 0) {
    return NextResponse.json({ keywords: [], dates: [], rows: [] })
  }

  const keywordIds = keywords.map((k) => k.id)

  // Get all ranking rows for these keywords within the date range
  const { data: rankings, error: rankError } = await supabase
    .from('serp_rankings')
    .select('keyword_id, position, source, checked_at')
    .in('keyword_id', keywordIds)
    .gte('checked_at', since.toISOString())
    .order('checked_at', { ascending: true })

  if (rankError) {
    return NextResponse.json({ error: rankError.message }, { status: 500 })
  }

  // Build a map: keyword_id -> keyword text
  const kwMap: Record<string, string> = {}
  for (const kw of keywords) {
    kwMap[kw.id] = kw.keyword
  }

  // Collect all unique dates (YYYY-MM-DD)
  const dateSet = new Set<string>()
  for (const r of rankings || []) {
    dateSet.add(r.checked_at.slice(0, 10))
  }
  const dates = Array.from(dateSet).sort()

  // Build rows: one per keyword
  // row = { keyword, positions: { [date]: { gsc: number|null, bing: number|null, serp: number|null } } }
  const rowMap: Record<string, {
    keyword: string
    positions: Record<string, { gsc: number | null; bing: number | null; serp: number | null }>
  }> = {}

  for (const kw of keywords) {
    rowMap[kw.id] = {
      keyword: kw.keyword,
      positions: {},
    }
    for (const date of dates) {
      rowMap[kw.id].positions[date] = { gsc: null, bing: null, serp: null }
    }
  }

  for (const r of rankings || []) {
    const dateKey = r.checked_at.slice(0, 10)
    const row = rowMap[r.keyword_id]
    if (!row) continue

    if (!row.positions[dateKey]) {
      row.positions[dateKey] = { gsc: null, bing: null, serp: null }
    }

    const source = (r.source || 'serp').toLowerCase()
    if (source === 'gsc' || source === 'google') {
      row.positions[dateKey].gsc = r.position
    } else if (source === 'bing' || source === 'yahoo') {
      row.positions[dateKey].bing = r.position
    } else {
      row.positions[dateKey].serp = r.position
    }
  }

  const rows = Object.values(rowMap)

  return NextResponse.json({ dates, rows })
}
