import { createAdminSupabase } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Called by cron to send weekly email reports
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return NextResponse.json({ error: 'Resend not configured' }, { status: 500 })

  const supabase = createAdminSupabase()

  // Get users with weekly reports enabled
  const { data: users } = await supabase
    .from('profiles')
    .select('id, email, full_name, weekly_report_enabled')
    .eq('weekly_report_enabled', true)

  if (!users || users.length === 0) return NextResponse.json({ sent: 0 })

  let sent = 0

  for (const user of users) {
    if (!user.email) continue

    // Get their sites
    const { data: sites } = await supabase
      .from('sites')
      .select('id, url, name')
      .eq('user_id', user.id)

    if (!sites || sites.length === 0) continue

    // Get latest audit for each site
    const siteReports = []
    for (const site of sites) {
      const { data: audit } = await supabase
        .from('audit_reports')
        .select('overall_score, grade, summary, created_at')
        .eq('site_id', site.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const { count: keywordCount } = await supabase
        .from('keywords')
        .select('id', { count: 'exact' })
        .eq('site_id', site.id)

      siteReports.push({
        name: site.name || site.url,
        url: site.url,
        score: audit?.overall_score || 'N/A',
        grade: audit?.grade || 'N/A',
        summary: audit?.summary || 'No audit run yet',
        keywords: keywordCount || 0,
      })
    }

    // Build email HTML
    const siteRows = siteReports.map(s => `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #f0f4f8;">
          <strong>${s.name}</strong><br>
          <span style="color:#939393;font-size:12px;">${s.url}</span>
        </td>
        <td style="padding:12px;border-bottom:1px solid #f0f4f8;text-align:center;">
          <span style="font-size:24px;font-weight:700;color:${(s.score as number) >= 80 ? '#00d084' : (s.score as number) >= 50 ? '#ffa500' : '#ff4444'};">${s.score}</span>
        </td>
        <td style="padding:12px;border-bottom:1px solid #f0f4f8;text-align:center;font-weight:700;">${s.grade}</td>
        <td style="padding:12px;border-bottom:1px solid #f0f4f8;text-align:center;">${s.keywords}</td>
      </tr>
    `).join('')

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#2367a0;padding:1.5rem;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:20px;">AI SEO <span style="color:#68ccd1;">Weekly Report</span></h1>
        </div>
        <div style="background:#fff;padding:1.5rem;border:1px solid #e4eaf0;border-top:none;">
          <p style="color:#4a6080;font-size:15px;">Hi ${user.full_name || 'there'},</p>
          <p style="color:#4a6080;font-size:14px;">Here's your weekly SEO summary:</p>

          <table style="width:100%;border-collapse:collapse;margin:1rem 0;">
            <thead>
              <tr style="background:#f8f9fb;">
                <th style="padding:10px 12px;text-align:left;font-size:12px;color:#939393;">Site</th>
                <th style="padding:10px 12px;text-align:center;font-size:12px;color:#939393;">Score</th>
                <th style="padding:10px 12px;text-align:center;font-size:12px;color:#939393;">Grade</th>
                <th style="padding:10px 12px;text-align:center;font-size:12px;color:#939393;">Keywords</th>
              </tr>
            </thead>
            <tbody>${siteRows}</tbody>
          </table>

          <div style="text-align:center;margin:1.5rem 0;">
            <a href="https://seo.cgmimm.com/dashboard" style="display:inline-block;padding:12px 32px;background:#e4b34f;color:#fff;border-radius:50px;text-decoration:none;font-weight:700;font-size:14px;">View Dashboard</a>
          </div>
        </div>
        <div style="padding:1rem;text-align:center;font-size:11px;color:#939393;">
          <a href="https://seo.cgmimm.com/dashboard/settings" style="color:#68ccd1;">Unsubscribe from weekly reports</a>
        </div>
      </div>
    `

    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'SEO by CGMIMM <noreply@cgmimm.com>',
          to: user.email,
          subject: `Your Weekly SEO Report — ${siteReports.map(s => s.score).join(', ')} scores`,
          html,
        }),
      })
      sent++
    } catch {}
  }

  return NextResponse.json({ sent })
}
