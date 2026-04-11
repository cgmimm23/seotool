import { createAdminSupabase } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const cookieStore = cookies()
  const adminSession = cookieStore.get('admin_session')?.value

  if (!adminSession) {
    return NextResponse.json({ role: null }, { status: 401 })
  }

  const supabase = createAdminSupabase()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', adminSession)
    .single()

  return NextResponse.json({
    role: profile?.role || 'user',
    email: profile?.email || '',
  })
}
