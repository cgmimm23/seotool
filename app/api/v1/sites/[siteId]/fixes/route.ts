import { authenticateApiKey } from '@/lib/api-auth'
import { prisma } from '@/lib/db'
import { generateAndStoreFixes } from '@/lib/fix-generator'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: Fetch pending fixes for a site
export async function GET(req: NextRequest, { params }: { params: { siteId: string } }) {
  const auth = await authenticateApiKey(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  // Verify site ownership
  const site = await prisma.sites.findFirst({
    where: { id: params.siteId, user_id: auth.userId },
    select: { id: true, url: true },
  })

  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'pending'

  const data = await prisma.fix_instructions.findMany({
    where: {
      site_id: params.siteId,
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

  return NextResponse.json({ fixes: data })
}

// POST: Generate new fixes from latest audit
export async function POST(req: NextRequest, { params }: { params: { siteId: string } }) {
  const auth = await authenticateApiKey(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const site = await prisma.sites.findFirst({
    where: { id: params.siteId, user_id: auth.userId },
    select: { id: true, url: true },
  })

  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 })

  // Get latest audit
  const audit = await prisma.audit_reports.findFirst({
    where: { site_id: params.siteId },
    select: { id: true },
    orderBy: { created_at: 'desc' },
  })

  if (!audit) return NextResponse.json({ error: 'No audit found. Run an audit first.' }, { status: 404 })

  const count = await generateAndStoreFixes(params.siteId, audit.id, site.url)

  return NextResponse.json({ generated: count, message: `${count} fix instructions generated` })
}
