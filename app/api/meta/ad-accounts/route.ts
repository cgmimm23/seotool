import { NextRequest, NextResponse } from 'next/server'
import { getSiteMeta, graphFetch } from '@/lib/meta'
import { createServerSupabase } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('siteId')
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 })

  const ctx = await getSiteMeta(siteId)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ctx.tokens.user_access_token) return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })

  try {
    const accts = await graphFetch('/me/adaccounts', ctx.tokens.user_access_token, {
      fields: 'id,name,account_status,currency,business{id,name}',
    })
    return NextResponse.json({ accounts: accts.data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { siteId, adAccountId } = await req.json()
  if (!siteId || !adAccountId) return NextResponse.json({ error: 'siteId and adAccountId required' }, { status: 400 })

  const ctx = await getSiteMeta(siteId)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerSupabase()
  await supabase.from('sites').update({ meta_ad_account_id: adAccountId }).eq('id', siteId)
  return NextResponse.json({ success: true })
}
