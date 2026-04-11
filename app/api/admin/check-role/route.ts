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
  const { data: admin } = await supabase
    .from('admin_accounts')
    .select('email, name')
    .eq('id', adminSession)
    .single()

  if (!admin) {
    return NextResponse.json({ role: null }, { status: 401 })
  }

  return NextResponse.json({ role: 'admin', email: admin.email, name: admin.name })
}
