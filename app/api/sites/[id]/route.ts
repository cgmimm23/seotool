import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/auth'

// Columns a site owner is allowed to update via PATCH.
const ALLOWED_SITE_FIELDS = [
  'name',
  'site_type',
  'platform',
  'audit_notes',
  'bing_site_url',
  'bing_api_key',
  'gsc_site_url',
  'ga4_property_id',
] as const

// GET /api/sites/[id] — the owned site plus a recent-activity overview
// (audit_reports, crawl_reports, keywords, pagespeed, ai-visibility, rankings).
// 404 if not owned by the caller.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const site = await prisma.sites.findFirst({ where: { id: params.id, user_id: user.id } })
  if (!site) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [audits, crawls, keywords, pagespeed, aiVisibility, rankings] = await Promise.all([
    prisma.audit_reports.findMany({
      where: { site_id: site.id, user_id: user.id },
      orderBy: { created_at: 'desc' },
      take: 50,
    }),
    prisma.crawl_reports.findMany({
      where: { site_id: site.id, user_id: user.id },
      orderBy: { created_at: 'desc' },
      take: 20,
    }),
    prisma.keywords.findMany({
      where: { site_id: site.id, user_id: user.id },
      orderBy: { created_at: 'desc' },
    }),
    prisma.pagespeed_reports.findMany({
      where: { site_id: site.id, user_id: user.id },
      orderBy: { created_at: 'desc' },
      take: 1,
    }),
    prisma.ai_visibility_reports.findMany({
      where: { site_id: site.id, user_id: user.id },
      orderBy: { created_at: 'desc' },
      take: 1,
    }),
    // serp_rankings has no site_id; scope through the site's keywords.
    prisma.serp_rankings.findMany({
      where: {
        user_id: user.id,
        checked_at: { gte: since },
        keywords: { site_id: site.id },
      },
      orderBy: { checked_at: 'desc' },
    }),
  ])

  return NextResponse.json({ site, audits, crawls, keywords, pagespeed, aiVisibility, rankings })
}

// PATCH /api/sites/[id] — owner-scoped update of whitelisted columns only.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const site = await prisma.sites.findFirst({ where: { id: params.id, user_id: user.id } })
  if (!site) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const data: Record<string, any> = {}
  for (const field of ALLOWED_SITE_FIELDS) {
    if (body[field] !== undefined) data[field] = body[field]
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
  }

  const updated = await prisma.sites.update({
    where: { id: site.id },
    data,
  })

  return NextResponse.json({ site: updated })
}

// DELETE /api/sites/[id] — owner-scoped.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const result = await prisma.sites.deleteMany({ where: { id: params.id, user_id: user.id } })
  if (result.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
