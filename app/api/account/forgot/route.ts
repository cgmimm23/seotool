import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

// Token-based password reset (replaces supabase.auth.resetPasswordForEmail).
// Stores a bcrypt hash of a random token in auth.users.recovery_token + stamps
// recovery_sent_at, then emails a link to /reset-password?token=…&email=…
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const email = String(body.email || '').trim().toLowerCase()
  if (!email) return NextResponse.json({ error: 'Email is required.' }, { status: 400 })

  const user = await prisma.users.findFirst({ where: { email }, select: { id: true } })
  if (user) {
    const token = randomUUID() + randomUUID().replace(/-/g, '')
    const tokenHash = await bcrypt.hash(token, 10)
    await prisma.users.update({
      where: { id: user.id },
      data: { recovery_token: tokenHash, recovery_sent_at: new Date() },
    })

    const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://seo.cgmimm.com'
    const link = `${appUrl}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
    const apiKey = process.env.RESEND_API_KEY
    if (apiKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'SEO by CGMIMM <no-reply@seo.cgmimm.com>',
          to: [email],
          subject: 'Reset your password',
          html: `<p>Reset your password:</p><p><a href="${link}">${link}</a></p><p style="color:#777;font-size:12px">This link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
        }),
      }).catch((e) => console.error('[forgot] resend failed:', e))
    }
  }

  // Always report success (anti-enumeration).
  return NextResponse.json({ ok: true })
}
