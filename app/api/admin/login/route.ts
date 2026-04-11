import { createAdminSupabase } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { email, password, passkey } = await req.json()

  if (!email || !password || !passkey) {
    return NextResponse.json({ error: 'All fields required' }, { status: 400 })
  }

  // Check passkey
  const validPasskey = process.env.ADMIN_PASSKEY
  if (!validPasskey || passkey !== validPasskey) {
    return NextResponse.json({ error: 'Invalid passkey' }, { status: 403 })
  }

  // Look up admin in admin_accounts table — completely separate from customer auth
  const supabase = createAdminSupabase()
  const { data: admin, error } = await supabase
    .from('admin_accounts')
    .select('id, email, password_hash, name')
    .eq('email', email)
    .single()

  if (error || !admin) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  // Verify password
  const valid = await bcrypt.compare(password, admin.password_hash)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  // Set admin session cookie with admin account ID
  const response = NextResponse.json({ success: true })
  response.cookies.set('admin_session', admin.id, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  })

  return response
}
