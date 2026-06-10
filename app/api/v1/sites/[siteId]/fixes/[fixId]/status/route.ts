import { authenticateApiKey } from '@/lib/api-auth'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: { siteId: string; fixId: string } }) {
  const auth = await authenticateApiKey(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { status, applied_by, plugin_version, error_message } = await req.json()

  if (!status || !['applied', 'failed', 'skipped', 'manual_review'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status. Must be: applied, failed, skipped, manual_review' }, { status: 400 })
  }

  // Verify ownership
  const fix = await prisma.fix_instructions.findFirst({
    where: { id: params.fixId, site_id: params.siteId },
    select: { id: true, site_id: true },
  })

  if (!fix) return NextResponse.json({ error: 'Fix not found' }, { status: 404 })

  const site = await prisma.sites.findFirst({
    where: { id: params.siteId, user_id: auth.userId },
    select: { id: true },
  })

  if (!site) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const updates: any = {
    status,
    applied_by: applied_by || null,
    plugin_version: plugin_version || null,
  }

  if (status === 'applied') updates.applied_at = new Date()
  if (status === 'failed') updates.error_message = error_message || null

  await prisma.fix_instructions.update({
    where: { id: params.fixId },
    data: updates,
  })

  return NextResponse.json({ success: true })
}
