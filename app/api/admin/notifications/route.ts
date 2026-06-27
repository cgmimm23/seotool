import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { sendMail } from '@/lib/sendmail'

export const dynamic = 'force-dynamic'

// Send in-app notification + optional email broadcast
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { title, message, type, filter, sendEmail, subject } = await req.json()
  if (!title || !message) return NextResponse.json({ error: 'title and message required' }, { status: 400 })

  // Get recipients
  const planFilter =
    filter === 'starter' || filter === 'pro' || filter === 'enterprise' || filter === 'free'
      ? { plan: filter }
      : {}

  const users = await prisma.profiles.findMany({
    where: planFilter,
    select: { id: true, email: true, plan: true },
  })

  if (!users || users.length === 0) {
    return NextResponse.json({ error: 'No recipients found' }, { status: 400 })
  }

  // Create in-app notifications
  if (filter === 'all') {
    // Broadcast to everyone — use NULL user_id
    await prisma.notifications.create({
      data: {
        user_id: null,
        title,
        message,
        type: type || 'info',
      },
    })
  } else {
    // Individual notifications
    const rows = users.map(u => ({
      user_id: u.id,
      title,
      message,
      type: type || 'info',
    }))
    await prisma.notifications.createMany({ data: rows })
  }

  // Send emails via Resend if requested
  let emailsSent = 0
  if (sendEmail) {
    for (const user of users) {
      if (!user.email) continue
      await sendMail({
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
      })
      emailsSent++
    }
  }

  // Log broadcast
  await prisma.email_broadcasts.create({
    data: {
      admin_id: auth.user!.id,
      subject: subject || title,
      body: message,
      recipient_filter: filter || 'all',
      recipient_count: users.length,
    },
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

  const data = await prisma.email_broadcasts.findMany({
    orderBy: { sent_at: 'desc' },
    take: 50,
  })

  return NextResponse.json({ broadcasts: data || [] })
}
