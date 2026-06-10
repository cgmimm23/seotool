import { requireEnterprise } from '@/lib/enterprise'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { webhookId: string } }) {
  const auth = await requireEnterprise()
  if (auth.error) return auth.error

  // webhook_deliveries has no user_id; scope through the owning webhook.
  const deliveries = await prisma.webhook_deliveries.findMany({
    where: {
      webhook_id: params.webhookId,
      webhooks: { user_id: auth.user!.id },
    },
    select: {
      id: true,
      event: true,
      payload: true,
      response_status: true,
      success: true,
      attempted_at: true,
    },
    orderBy: { attempted_at: 'desc' },
    take: 50,
  })

  return NextResponse.json({ deliveries })
}
