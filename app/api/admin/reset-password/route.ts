import { createAdminSupabase } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { token, newPassword } = await req.json()
  if (!token || !newPassword) return NextResponse.json({ error: 'Token and new password required' }, { status: 400 })

  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const supabase = createAdminSupabase()

  // Find admin by token
  const { data: admin } = await supabase
    .from('admin_accounts')
    .select('id, reset_token_expires_at')
    .eq('reset_token', token)
    .single()

  if (!admin) return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 })

  if (!admin.reset_token_expires_at || new Date(admin.reset_token_expires_at) < new Date()) {
    return NextResponse.json({ error: 'Reset link has expired. Request a new one.' }, { status: 400 })
  }

  // Hash new password and clear token
  const newHash = await bcrypt.hash(newPassword, 10)
  await supabase
    .from('admin_accounts')
    .update({
      password_hash: newHash,
      reset_token: null,
      reset_token_expires_at: null,
    })
    .eq('id', admin.id)

  return NextResponse.json({ success: true })
}
