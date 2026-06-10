import { requireEnterprise } from '@/lib/enterprise'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireEnterprise()
  if (auth.error) return auth.error

  const webhooks = await prisma.webhooks.findMany({
    where: { user_id: auth.user!.id },
    select: {
      id: true,
      url: true,
      events: true,
      active: true,
      description: true,
      last_triggered_at: true,
      failure_count: true,
      created_at: true,
    },
    orderBy: { created_at: 'desc' },
  })

  return NextResponse.json({ webhooks })
}

export async function POST(req: NextRequest) {
  const auth = await requireEnterprise()
  if (auth.error) return auth.error

  const { url, events, description } = await req.json()
  if (!url || !events?.length) return NextResponse.json({ error: 'url and events required' }, { status: 400 })

  const secret = crypto.randomBytes(32).toString('hex')

  const webhook = await prisma.webhooks.create({
    data: {
      user_id: auth.user!.id,
      url,
      secret,
      events,
      description: description || '',
    },
  })

  return NextResponse.json({ webhook, secret, message: 'Save this secret — it will not be shown again.' }, { status: 201 })
}
