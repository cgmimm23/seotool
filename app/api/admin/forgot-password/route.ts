import { createAdminSupabase } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const supabase = createAdminSupabase()

  // Find admin account
  const { data: admin } = await supabase
    .from('admin_accounts')
    .select('id, email, name')
    .eq('email', email)
    .single()

  // Always return success to avoid email enumeration
  if (!admin) {
    return NextResponse.json({ success: true })
  }

  // Generate reset token
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour

  await supabase
    .from('admin_accounts')
    .update({ reset_token: token, reset_token_expires_at: expiresAt })
    .eq('id', admin.id)

  // Send email via Resend
  const resendKey = process.env.RESEND_API_KEY
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://seo.cgmimm.com'
  const resetUrl = `${siteUrl}/admin/reset-password?token=${token}`

  if (resendKey) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'SEO by CGMIMM <noreply@cgmimm.com>',
          to: admin.email,
          subject: 'Admin Password Reset',
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:2rem;">
            <div style="background:#2367a0;padding:1.5rem;border-radius:12px 12px 0 0;text-align:center;">
              <h1 style="color:#fff;margin:0;font-size:20px;">Admin Portal <span style="color:#68ccd1;">Password Reset</span></h1>
            </div>
            <div style="background:#fff;padding:2rem;border:1px solid #e4eaf0;border-top:none;border-radius:0 0 12px 12px;">
              <p style="color:#4a6080;line-height:1.6;font-size:15px;">Someone requested a password reset for your admin account at SEO by CGMIMM.</p>
              <p style="color:#4a6080;font-size:14px;">Click the button below to reset your password. This link expires in 1 hour.</p>
              <div style="text-align:center;margin:1.5rem 0;">
                <a href="${resetUrl}" style="display:inline-block;padding:12px 32px;background:#e4b34f;color:#fff;border-radius:50px;text-decoration:none;font-weight:700;font-size:14px;">Reset Password</a>
              </div>
              <p style="color:#939393;font-size:12px;">Or copy this link: ${resetUrl}</p>
              <hr style="border:none;border-top:1px solid #e4eaf0;margin:1.5rem 0;">
              <p style="color:#939393;font-size:11px;">If you didn't request this, ignore this email. Your password won't change.</p>
            </div>
          </div>`,
        }),
      })
    } catch (err) {
      console.error('Failed to send reset email:', err)
    }
  }

  return NextResponse.json({ success: true })
}
