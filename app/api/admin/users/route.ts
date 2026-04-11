import { requireAdmin } from '@/lib/admin-auth'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '25')
  const search = searchParams.get('search') || ''
  const planFilter = searchParams.get('plan') || ''
  const statusFilter = searchParams.get('status') || ''
  const offset = (page - 1) * limit

  const supabase = auth.supabase

  let query = supabase
    .from('profiles')
    .select('*, sites:sites(count)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
  }
  if (planFilter) {
    query = query.eq('plan', planFilter)
  }
  if (statusFilter) {
    query = query.eq('status', statusFilter)
  }

  const { data: users, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    users: users?.map(u => ({
      ...u,
      sites_count: u.sites?.[0]?.count || 0,
    })),
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { email, password, full_name, plan } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  const adminSupabase = createAdminSupabase()

  const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // Update profile with plan
  if (plan && plan !== 'free') {
    await adminSupabase
      .from('profiles')
      .update({ plan, full_name })
      .eq('id', authUser.user.id)
  }

  // Log activity
  await auth.supabase.from('admin_activity_log').insert({
    admin_id: auth.user!.id,
    action: 'create_user',
    target_user_id: authUser.user.id,
    details: { email, plan: plan || 'free' },
  })

  return NextResponse.json({ user: authUser.user })
}
