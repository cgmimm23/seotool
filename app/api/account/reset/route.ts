import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

const ONE_HOUR_MS = 60 * 60 * 1000

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const token = String(body.token || '')
  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }
  if (!token || !email) {
    return NextResponse.json({ error: 'Invalid or expired reset link.' }, { status: 400 })
  }

  const user = await prisma.users.findFirst({
    where: { email },
    select: { id: true, recovery_token: true, recovery_sent_at: true },
  })
  if (!user?.recovery_token || !user.recovery_sent_at) {
    return NextResponse.json({ error: 'Invalid or expired reset link.' }, { status: 400 })
  }
  const fresh = Date.now() - user.recovery_sent_at.getTime() < ONE_HOUR_MS
  const match = await bcrypt.compare(token, user.recovery_token)
  if (!fresh || !match) {
    return NextResponse.json({ error: 'Invalid or expired reset link. Request a new one.' }, { status: 400 })
  }

  const encrypted_password = await bcrypt.hash(password, 10)
  await prisma.users.update({
    where: { id: user.id },
    data: { encrypted_password, recovery_token: '', recovery_sent_at: null },
  })
  return NextResponse.json({ ok: true })
}
