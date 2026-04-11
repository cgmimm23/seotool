import { createAdminSupabase } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function requireAdmin() {
  const cookieStore = cookies()
  const adminSession = cookieStore.get('admin_session')?.value

  if (!adminSession) {
    return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }), user: null, supabase: null as any }
  }

  const supabase = createAdminSupabase()

  // Look up in admin_accounts — completely separate from customer profiles
  const { data: admin } = await supabase
    .from('admin_accounts')
    .select('id, email, name')
    .eq('id', adminSession)
    .single()

  if (!admin) {
    return { error: NextResponse.json({ error: 'Not authorized' }, { status: 403 }), user: null, supabase: null as any }
  }

  return { error: null, user: { id: admin.id, email: admin.email }, supabase }
}
