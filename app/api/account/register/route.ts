import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

// Direct signup (replaces supabase.auth.signUp). Creates the auth.users row;
// the on_auth_user_created trigger provisions the matching profile. The client
// then signs in with NextAuth credentials.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }
  const existing = await prisma.users.findFirst({ where: { email }, select: { id: true } })
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
  }
  const encrypted_password = await bcrypt.hash(password, 10)
  const now = new Date()
  await prisma.users.create({
    data: {
      id: randomUUID(),
      email,
      encrypted_password,
      email_confirmed_at: now,
      aud: 'authenticated',
      role: 'authenticated',
      created_at: now,
      updated_at: now,
      raw_app_meta_data: { provider: 'email', providers: ['email'] },
      raw_user_meta_data: {},
    },
  })
  return NextResponse.json({ ok: true })
}
