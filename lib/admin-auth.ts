import { createAdminSupabase } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function requireAdmin() {
  const cookieStore = cookies()
  const adminSession = cookieStore.get('admin_session')?.value

  if (!adminSession) {
    return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }), user: null, supabase: null as any }
  }

  // admin_session cookie contains the user ID, set by /api/admin/login
  const userId = adminSession
  const supabase = createAdminSupabase()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Not authorized' }, { status: 403 }), user: null, supabase: null as any }
  }

  return { error: null, user: { id: userId, email: profile.email }, supabase }
}
