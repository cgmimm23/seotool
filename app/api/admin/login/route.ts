import { createAdminSupabase } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { email, password, passkey } = await req.json()

  if (!email || !password || !passkey) {
    return NextResponse.json({ error: 'All fields required' }, { status: 400 })
  }

  // Check passkey first
  const validPasskey = process.env.ADMIN_PASSKEY
  if (!validPasskey || passkey !== validPasskey) {
    return NextResponse.json({ error: 'Invalid passkey' }, { status: 403 })
  }

  // Verify credentials via Supabase Auth REST API
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
    },
    body: JSON.stringify({ email, password }),
  })

  if (!authRes.ok) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  const authData = await authRes.json()
  const userId = authData.user?.id

  if (!userId) {
    return NextResponse.json({ error: 'Auth failed' }, { status: 401 })
  }

  // Check admin role using service role key (no RLS issues)
  const adminSupabase = createAdminSupabase()
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Not an admin account' }, { status: 403 })
  }

  // Generate a signed admin token
  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

  // Store token hash in a cookie and return the access token for Supabase client
  const response = NextResponse.json({
    success: true,
    access_token: authData.access_token,
    refresh_token: authData.refresh_token,
  })

  response.cookies.set('admin_session', tokenHash, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  })

  return response
}
