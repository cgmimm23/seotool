import { requireAdmin } from '@/lib/admin-auth'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const adminSupabase = createAdminSupabase()

  const { data: profile, error: pErr } = await adminSupabase
    .from('profiles')
    .select('email')
    .eq('id', params.id)
    .single()

  if (pErr || !profile?.email) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const origin = req.nextUrl.origin
  const { data, error } = await adminSupabase.auth.admin.generateLink({
    type: 'magiclink',
    email: profile.email,
    options: { redirectTo: `${origin}/dashboard` },
  })

  if (error || !data?.properties?.action_link) {
    return NextResponse.json({ error: error?.message || 'Failed to generate link' }, { status: 500 })
  }

  await auth.supabase.from('admin_activity_log').insert({
    admin_id: auth.user!.id,
    action: 'impersonate_user',
    target_user_id: params.id,
    details: { email: profile.email },
  })

  return NextResponse.json({ url: data.properties.action_link })
}
