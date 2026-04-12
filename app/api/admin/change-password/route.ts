import { requireAdmin } from '@/lib/admin-auth'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { currentPassword, newPassword } = await req.json()

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Current and new password required' }, { status: 400 })
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
  }

  const supabase = createAdminSupabase()

  // Get current hash
  const { data: admin } = await supabase
    .from('admin_accounts')
    .select('password_hash')
    .eq('id', auth.user!.id)
    .single()

  if (!admin) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  // Verify current password
  const valid = await bcrypt.compare(currentPassword, admin.password_hash)
  if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })

  // Hash and save new password
  const newHash = await bcrypt.hash(newPassword, 10)
  await supabase
    .from('admin_accounts')
    .update({ password_hash: newHash })
    .eq('id', auth.user!.id)

  return NextResponse.json({ success: true })
}
