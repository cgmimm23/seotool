import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/auth'
import { generateKeywordStrategy } from '@/lib/anthropic'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { siteId } = await request.json()
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 })

    const site = await prisma.sites.findFirst({
      where: { id: siteId, user_id: user.id },
      select: { url: true, site_type: true, platform: true, audit_notes: true },
    })

    if (!site?.url) return NextResponse.json({ error: 'Site not found' }, { status: 404 })

    const strategy = await generateKeywordStrategy(
      site.url,
      site.site_type,
      site.platform,
      site.audit_notes,
    )

    const report = await prisma.keyword_strategies.create({
      data: {
        site_id: siteId,
        user_id: user.id,
        summary: strategy.summary,
        core_phrases: strategy.core_phrases,
        long_tail_clusters: strategy.long_tail_clusters,
        deployment_strategy: strategy.deployment_strategy,
      },
    })

    return NextResponse.json({ strategy, report })
  } catch (err: any) {
    console.error('Keyword strategy error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 })

    const data = await prisma.keyword_strategies.findMany({
      where: { site_id: siteId, user_id: user.id },
      orderBy: { created_at: 'desc' },
      take: 10,
    })

    return NextResponse.json({ strategies: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
