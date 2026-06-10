import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/ai-visibility/reports?siteId= — recent AI-visibility reports for an owned site.
export async function GET(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('siteId')
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 })

  const site = await prisma.sites.findFirst({
    where: { id: siteId, user_id: user.id },
    select: { id: true },
  })
  if (!site) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const reports = await prisma.ai_visibility_reports.findMany({
    where: { site_id: siteId, user_id: user.id },
    orderBy: { created_at: 'desc' },
    take: 50,
  })

  return NextResponse.json({ reports })
}

// POST /api/ai-visibility/reports?siteId= — store an AI-visibility report for an owned site.
export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('siteId')
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 })

  const site = await prisma.sites.findFirst({
    where: { id: siteId, user_id: user.id },
    select: { id: true },
  })
  if (!site) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  if (!body.url) return NextResponse.json({ error: 'url required' }, { status: 400 })

  const report = await prisma.ai_visibility_reports.create({
    data: {
      site_id: siteId,
      user_id: user.id,
      url: body.url,
      overall_score: body.overall_score ?? null,
      ai_overview_likelihood: body.ai_overview_likelihood ?? null,
      summary: body.summary ?? null,
      checks: body.checks ?? undefined,
      bot_status: body.bot_status ?? undefined,
      llms_exists: body.llms_exists ?? null,
      robots_exists: body.robots_exists ?? null,
      result: body.result ?? undefined,
    },
  })

  return NextResponse.json({ report }, { status: 201 })
}
