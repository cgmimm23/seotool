import { prisma } from '@/lib/db'
import { getUser } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Scope: this route previously ran with the service-role key and no auth,
  // so any caller could read any site's rankings. Require login + site ownership.
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('siteId')
  const days = parseInt(searchParams.get('days') || '30')

  if (!siteId) {
    return NextResponse.json({ error: 'siteId param required' }, { status: 400 })
  }

  const ownedSite = await prisma.sites.findFirst({
    where: { id: siteId, user_id: user.id },
    select: { id: true },
  })
  if (!ownedSite) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const since = new Date()
  since.setDate(since.getDate() - days)

  const keywords = await prisma.keywords.findMany({
    where: { site_id: siteId },
    select: { id: true, keyword: true },
  })

  if (!keywords || keywords.length === 0) {
    return NextResponse.json({ keywords: [], dates: [], rows: [] })
  }

  const keywordIds = keywords.map((k) => k.id)

  const rankings = await prisma.serp_rankings.findMany({
    where: { keyword_id: { in: keywordIds }, checked_at: { gte: since } },
    select: { keyword_id: true, position: true, source: true, checked_at: true },
    orderBy: { checked_at: 'asc' },
  })

  const toDateKey = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '')

  const kwMap: Record<string, string> = {}
  for (const kw of keywords) {
    kwMap[kw.id] = kw.keyword
  }

  const dateSet = new Set<string>()
  for (const r of rankings) {
    dateSet.add(toDateKey(r.checked_at))
  }
  const dates = Array.from(dateSet).sort()

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

  for (const r of rankings) {
    const dateKey = toDateKey(r.checked_at)
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
