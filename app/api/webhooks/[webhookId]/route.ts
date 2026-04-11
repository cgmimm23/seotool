import { requireEnterprise } from '@/lib/enterprise'
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

  const { error } = await auth.supabase
    .from('webhooks')
    .update(updates)
    .eq('id', params.webhookId)
    .eq('user_id', auth.user!.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { webhookId: string } }) {
  const auth = await requireEnterprise()
  if (auth.error) return auth.error

  const { error } = await auth.supabase
    .from('webhooks')
    .delete()
    .eq('id', params.webhookId)
    .eq('user_id', auth.user!.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
