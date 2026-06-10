import { requireEnterprise } from '@/lib/enterprise'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { webhookId: string } }) {
  const auth = await requireEnterprise()
  if (auth.error) return auth.error

  const body = await req.json()
  const updates: Record<string, any> = {}
  if (body.url !== undefined) updates.url = body.url
  if (body.events !== undefined) updates.events = body.events
  if (body.active !== undefined) updates.active = body.active
  if (body.description !== undefined) updates.description = body.description

  await prisma.webhooks.updateMany({
    where: { id: params.webhookId, user_id: auth.user!.id },
    data: updates,
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { webhookId: string } }) {
  const auth = await requireEnterprise()
  if (auth.error) return auth.error

  await prisma.webhooks.deleteMany({
    where: { id: params.webhookId, user_id: auth.user!.id },
  })

  return NextResponse.json({ success: true })
}
