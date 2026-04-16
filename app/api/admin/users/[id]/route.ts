import { requireAdmin } from '@/lib/admin-auth'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const supabase = auth.supabase

  const [profileRes, sitesRes, auditsRes, keywordsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', params.id).single(),
    supabase.from('sites').select('id, url, name, active, created_at').eq('user_id', params.id),
    supabase.from('audit_reports').select('id', { count: 'exact' }).eq('user_id', params.id),
    supabase.from('keywords').select('id', { count: 'exact' }).eq('user_id', params.id),
  ])

  if (profileRes.error) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const { data: dupes } = await supabase
    .from('profiles')
    .select('id, plan, created_at')
    .eq('email', profileRes.data.email)
    .neq('id', params.id)

  return NextResponse.json({
    user: profileRes.data,
    sites: sitesRes.data || [],
    totalAudits: auditsRes.count || 0,
    totalKeywords: keywordsRes.count || 0,
    duplicates: dupes || [],
  })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const body = await req.json()
  const updates: Record<string, any> = {}
  const allowed = ['plan', 'status', 'full_name', 'role', 'trial_ends_at']

  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  // Setting a paid plan clears trial, reactivates, and skips onboarding gate.
  const paidPlans = ['starter', 'pro', 'agency', 'enterprise']
  if (updates.plan && paidPlans.includes(updates.plan)) {
    if (body.trial_ends_at === undefined) updates.trial_ends_at = null
    if (body.status === undefined) updates.status = 'active'
    updates.onboarding_completed = true
  }

  updates.updated_at = new Date().toISOString()

  const adminSupabase = createAdminSupabase()

  const { error } = await adminSupabase
    .from('profiles')
    .update(updates)
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // If suspending, ban the auth user too
  if (updates.status === 'suspended') {
    await adminSupabase.auth.admin.updateUserById(params.id, { ban_duration: '876000h' })
  } else if (updates.status === 'active') {
    await adminSupabase.auth.admin.updateUserById(params.id, { ban_duration: 'none' })
  }

  // Log activity
  await auth.supabase.from('admin_activity_log').insert({
    admin_id: auth.user!.id,
    action: 'update_user',
    target_user_id: params.id,
    details: updates,
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  // Prevent self-deletion
  if (params.id === auth.user!.id) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
  }

  const adminSupabase = createAdminSupabase()

  // Get user info for logging
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('email')
    .eq('id', params.id)
    .single()

  const { error } = await adminSupabase.auth.admin.deleteUser(params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log activity
  await auth.supabase.from('admin_activity_log').insert({
    admin_id: auth.user!.id,
    action: 'delete_user',
    target_user_id: params.id,
    details: { email: profile?.email },
  })

  return NextResponse.json({ success: true })
}
