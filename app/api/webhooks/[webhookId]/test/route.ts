import { requireEnterprise } from '@/lib/enterprise'
import { dispatchWebhook } from '@/lib/webhooks'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { webhookId: string } }) {
  const auth = await requireEnterprise()
  if (auth.error) return auth.error

  await dispatchWebhook('test.ping', auth.user!.id, {
    message: 'This is a test webhook from SEO by CGMIMM',
    webhook_id: params.webhookId,
  })

  return NextResponse.json({ success: true, message: 'Test event dispatched' })
}
