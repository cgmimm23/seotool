import { requireEnterprise } from '@/lib/enterprise'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireEnterprise()
  if (auth.error) return auth.error

  const { data, error } = await auth.supabase
    .from('webhooks')
    .select('id, url, events, active, description, last_triggered_at, failure_count, created_at')
    .eq('user_id', auth.user!.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ webhooks: data })
}

export async function POST(req: NextRequest) {
  const auth = await requireEnterprise()
  if (auth.error) return auth.error

  const { url, events, description } = await req.json()
  if (!url || !events?.length) return NextResponse.json({ error: 'url and events required' }, { status: 400 })

  const secret = crypto.randomBytes(32).toString('hex')

  const { data, error } = await auth.supabase.from('webhooks').insert({
    user_id: auth.user!.id,
    url,
    secret,
    events,
    description: description || '',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ webhook: data, secret, message: 'Save this secret — it will not be shown again.' }, { status: 201 })
}
