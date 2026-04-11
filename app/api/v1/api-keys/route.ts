import { requireEnterprise } from '@/lib/enterprise'
import { generateApiKey } from '@/lib/api-auth'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireEnterprise()
  if (auth.error) return auth.error

  const { data, error } = await auth.supabase
    .from('api_keys')
    .select('id, name, key_prefix, scopes, last_used_at, revoked, created_at')
    .eq('user_id', auth.user!.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ keys: data })
}

export async function POST(req: NextRequest) {
  const auth = await requireEnterprise()
  if (auth.error) return auth.error

  const { name, scopes } = await req.json()
  const { raw, hash, prefix } = generateApiKey()

  const { error } = await auth.supabase.from('api_keys').insert({
    user_id: auth.user!.id,
    name: name || 'Default',
    key_hash: hash,
    key_prefix: prefix,
    scopes: scopes || ['read'],
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ key: raw, prefix, message: 'Save this key — it will not be shown again.' }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireEnterprise()
  if (auth.error) return auth.error

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await auth.supabase
    .from('api_keys')
    .update({ revoked: true })
    .eq('id', id)
    .eq('user_id', auth.user!.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
