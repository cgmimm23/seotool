import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/db'
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

  // Get current hash
  const admin = await prisma.admin_accounts.findUnique({
    where: { id: auth.user!.id },
    select: { password_hash: true },
  })

  if (!admin) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  // Verify current password
  const valid = await bcrypt.compare(currentPassword, admin.password_hash)
  if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })

  // Hash and save new password
  const newHash = await bcrypt.hash(newPassword, 10)
  await prisma.admin_accounts.update({
    where: { id: auth.user!.id },
    data: { password_hash: newHash },
  })

  return NextResponse.json({ success: true })
}
