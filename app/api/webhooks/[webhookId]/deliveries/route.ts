import { requireEnterprise } from '@/lib/enterprise'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { webhookId: string } }) {
  const auth = await requireEnterprise()
  if (auth.error) return auth.error

  const { data, error } = await auth.supabase
    .from('webhook_deliveries')
    .select('id, event, payload, response_status, success, attempted_at')
    .eq('webhook_id', params.webhookId)
    .order('attempted_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ deliveries: data })
}
