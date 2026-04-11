import { requireEnterprise } from '@/lib/enterprise'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { teamId: string } }) {
  const auth = await requireEnterprise()
  if (auth.error) return auth.error

  const { data, error } = await auth.supabase
    .from('team_members')
    .select('id, user_id, role, invited_email, invite_status, invited_at, accepted_at')
    .eq('team_id', params.teamId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get profile info for accepted members
  const userIds = data.filter(m => m.user_id).map(m => m.user_id)
  const adminSupabase = createAdminSupabase()
  const { data: profiles } = await adminSupabase
    .from('profiles')
    .select('id, email, full_name')
    .in('id', userIds)

  const profileMap = new Map((profiles || []).map(p => [p.id, p]))
  const members = data.map(m => ({
    ...m,
    email: m.invited_email || profileMap.get(m.user_id)?.email || '',
    full_name: profileMap.get(m.user_id)?.full_name || '',
  }))

  return NextResponse.json({ members })
}

export async function POST(req: NextRequest, { params }: { params: { teamId: string } }) {
  const auth = await requireEnterprise()
  if (auth.error) return auth.error

  const { email, role } = await req.json()
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

  // Check if user exists
  const adminSupabase = createAdminSupabase()
  const { data: existingProfile } = await adminSupabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  const { error } = await auth.supabase.from('team_members').insert({
    team_id: params.teamId,
    user_id: existingProfile?.id || null,
    invited_email: email,
    role: role || 'member',
    invite_status: existingProfile ? 'accepted' : 'pending',
    accepted_at: existingProfile ? new Date().toISOString() : null,
  })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'User already in team' }, { status: 400 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: { teamId: string } }) {
  const auth = await requireEnterprise()
  if (auth.error) return auth.error

  const { memberId } = await req.json()
  if (!memberId) return NextResponse.json({ error: 'memberId required' }, { status: 400 })

  const { error } = await auth.supabase
    .from('team_members')
    .delete()
    .eq('id', memberId)
    .eq('team_id', params.teamId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
