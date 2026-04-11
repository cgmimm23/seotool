import { requireAdmin } from '@/lib/admin-auth'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Send in-app notification + optional email broadcast
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { title, message, type, filter, sendEmail, subject } = await req.json()
  if (!title || !message) return NextResponse.json({ error: 'title and message required' }, { status: 400 })

  const supabase = createAdminSupabase()

  // Get recipients
  let query = supabase.from('profiles').select('id, email, plan')
  if (filter === 'starter') query = query.eq('plan', 'starter')
  else if (filter === 'pro') query = query.eq('plan', 'pro')
  else if (filter === 'enterprise') query = query.eq('plan', 'enterprise')
  else if (filter === 'free') query = query.eq('plan', 'free')

  const { data: users } = await query

  if (!users || users.length === 0) {
    return NextResponse.json({ error: 'No recipients found' }, { status: 400 })
  }

  // Create in-app notifications
  if (filter === 'all') {
    // Broadcast to everyone — use NULL user_id
    await supabase.from('notifications').insert({
      user_id: null,
      title,
      message,
      type: type || 'info',
    })
  } else {
    // Individual notifications
    const rows = users.map(u => ({
      user_id: u.id,
      title,
      message,
      type: type || 'info',
    }))
    await supabase.from('notifications').insert(rows)
  }

  // Send emails via Resend if requested
  let emailsSent = 0
  if (sendEmail) {
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      for (const user of users) {
        if (!user.email) continue
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'SEO by CGMIMM <noreply@cgmimm.com>',
              to: user.email,
              subject: subject || title,
              html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:2rem;">
                <div style="background:#2367a0;padding:1.5rem;border-radius:12px 12px 0 0;text-align:center;">
                  <h1 style="color:#fff;margin:0;font-size:20px;">AI SEO <span style="color:#68ccd1;">powered by CGMIMM</span></h1>
                </div>
                <div style="background:#fff;padding:2rem;border:1px solid #e4eaf0;border-top:none;border-radius:0 0 12px 12px;">
                  <h2 style="color:#2367a0;margin:0 0 1rem;">${title}</h2>
                  <p style="color:#4a6080;line-height:1.6;font-size:15px;">${message}</p>
                  <hr style="border:none;border-top:1px solid #e4eaf0;margin:1.5rem 0;">
                  <p style="color:#939393;font-size:12px;">You're receiving this because you have an account at <a href="https://seo.cgmimm.com" style="color:#68ccd1;">seo.cgmimm.com</a></p>
                </div>
              </div>`,
            }),
          })
          emailsSent++
        } catch {}
      }
    }
  }

  // Log broadcast
  await supabase.from('email_broadcasts').insert({
    admin_id: auth.user!.id,
    subject: subject || title,
    body: message,
    recipient_filter: filter || 'all',
    recipient_count: users.length,
  })

  return NextResponse.json({
    success: true,
    notificationsSent: users.length,
    emailsSent,
  })
}

// GET: list broadcast history
export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const supabase = createAdminSupabase()
  const { data } = await supabase
    .from('email_broadcasts')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ broadcasts: data || [] })
}
