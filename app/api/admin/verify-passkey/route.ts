import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Get user from session
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Use admin client to check role (bypasses RLS timing issues)
  const adminSupabase = createAdminSupabase()
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Access denied. Admin credentials required.' }, { status: 403 })
  }

  const { passkey } = await req.json()
  const validPasskey = process.env.ADMIN_PASSKEY

  if (!validPasskey) {
    return NextResponse.json({ error: 'Passkey not configured on server' }, { status: 500 })
  }

  if (passkey !== validPasskey) {
    return NextResponse.json({ error: 'Invalid passkey' }, { status: 403 })
  }

  return NextResponse.json({ success: true })
}
