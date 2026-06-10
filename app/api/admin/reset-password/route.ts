import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { token, newPassword } = await req.json()
  if (!token || !newPassword) return NextResponse.json({ error: 'Token and new password required' }, { status: 400 })

  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  // Find admin by token
  const admin = await prisma.admin_accounts.findFirst({
    where: { reset_token: token },
    select: { id: true, reset_token_expires_at: true },
  })

  if (!admin) return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 })

  if (!admin.reset_token_expires_at || new Date(admin.reset_token_expires_at) < new Date()) {
    return NextResponse.json({ error: 'Reset link has expired. Request a new one.' }, { status: 400 })
  }

  // Hash new password and clear token
  const newHash = await bcrypt.hash(newPassword, 10)
  await prisma.admin_accounts.update({
    where: { id: admin.id },
    data: {
      password_hash: newHash,
      reset_token: null,
      reset_token_expires_at: null,
    },
  })

  return NextResponse.json({ success: true })
}
