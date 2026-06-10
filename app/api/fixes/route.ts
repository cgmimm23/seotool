import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/auth'
import { generateAndStoreFixes } from '@/lib/fix-generator'

export const dynamic = 'force-dynamic'

// GET /api/fixes?siteId= — session-scoped fixes for an owned site.
export async function GET(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('siteId')
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 })

  const site = await prisma.sites.findFirst({
    where: { id: siteId, user_id: user.id },
    select: { id: true, url: true },
  })
  if (!site) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const status = searchParams.get('status') || 'pending'

  const fixes = await prisma.fix_instructions.findMany({
    where: {
      site_id: siteId,
      ...(status !== 'all' ? { status } : {}),
    },
    select: {
      id: true,
      page_url: true,
      fix_type: true,
      priority: true,
      target: true,
      current_value: true,
      suggested_value: true,
      status: true,
      applied_by: true,
      applied_at: true,
      created_at: true,
    },
    orderBy: { created_at: 'desc' },
    take: 100,
  })

  return NextResponse.json({ fixes })
}

// POST /api/fixes?siteId= — generate fixes from the latest audit for an owned site.
export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('siteId')
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 })

  const site = await prisma.sites.findFirst({
    where: { id: siteId, user_id: user.id },
    select: { id: true, url: true },
  })
  if (!site) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const audit = await prisma.audit_reports.findFirst({
    where: { site_id: siteId },
    select: { id: true },
    orderBy: { created_at: 'desc' },
  })
  if (!audit) return NextResponse.json({ error: 'No audit found. Run an audit first.' }, { status: 404 })

  const count = await generateAndStoreFixes(siteId, audit.id, site.url)

  return NextResponse.json({ generated: count, message: `${count} fix instructions generated` })
}
