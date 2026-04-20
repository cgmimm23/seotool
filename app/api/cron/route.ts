import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runSeoAudit } from '@/lib/anthropic'
import { isDueForScan, Plan } from '@/lib/scheduler'

// Use service role for cron (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get all active sites with their schedule, site context, and user plan
    const { data: schedules, error } = await supabaseAdmin
      .from('scan_schedule')
      .select(`
        *,
        sites ( url, name, site_type, platform, audit_notes ),
        profiles ( plan )
      `)

    if (error) throw error

    const results = []
    for (const schedule of schedules || []) {
      const plan = (schedule as any).profiles?.plan as Plan
      const lastScanned = schedule.last_scanned_at
        ? new Date(schedule.last_scanned_at)
        : null

      if (!isDueForScan(plan, lastScanned)) continue

      const site = (schedule as any).sites
      const url = site?.url
      if (!url) continue

      try {
        // Pull the previous audit for delta comparison and notification
        const { data: prevReports } = await supabaseAdmin
          .from('audit_reports')
          .select('overall_score, checks, created_at')
          .eq('site_id', schedule.site_id)
          .order('created_at', { ascending: false })
          .limit(1)
        const prevAudit = prevReports?.[0]

        const audit = await runSeoAudit(url, site.site_type, site.platform, site.audit_notes)

        await supabaseAdmin.from('audit_reports').insert({
          site_id: schedule.site_id,
          user_id: schedule.user_id,
          url,
          overall_score: audit.overall_score,
          grade: audit.grade,
          summary: audit.summary,
          categories: audit.categories,
          checks: audit.checks,
        })

        await supabaseAdmin.from('scan_schedule').update({
          last_scanned_at: new Date().toISOString(),
        }).eq('site_id', schedule.site_id)

        // Create a notification if the score changed significantly or errors were added
        if (prevAudit) {
          const scoreDelta = audit.overall_score - prevAudit.overall_score
          const prevFail = (prevAudit.checks || []).filter((c: any) => c.status === 'fail').length
          const currFail = (audit.checks || []).filter((c: any) => c.status === 'fail').length
          const failDelta = currFail - prevFail

          if (Math.abs(scoreDelta) >= 5 || failDelta > 0) {
            const scoreLine = scoreDelta === 0
              ? `Score held steady at ${audit.overall_score}`
              : `Score ${scoreDelta > 0 ? 'improved' : 'dropped'} by ${Math.abs(scoreDelta)} points (now ${audit.overall_score})`
            const failLine = failDelta > 0 ? ` · ${failDelta} new error${failDelta > 1 ? 's' : ''}` : failDelta < 0 ? ` · ${Math.abs(failDelta)} error${Math.abs(failDelta) > 1 ? 's' : ''} fixed` : ''
            await supabaseAdmin.from('notifications').insert({
              user_id: schedule.user_id,
              title: `Audit complete: ${site.name || url}`,
              message: `${scoreLine}${failLine}`,
              type: scoreDelta < 0 || failDelta > 0 ? 'warning' : 'info',
            })
          }
        } else {
          // First audit — always notify
          await supabaseAdmin.from('notifications').insert({
            user_id: schedule.user_id,
            title: `First audit complete: ${site.name || url}`,
            message: `Overall score: ${audit.overall_score}/100 (${audit.grade}). Open the Site Audit page for details.`,
            type: 'info',
          })
        }

        results.push({ siteId: schedule.site_id, status: 'scanned', score: audit.overall_score })
      } catch (err: any) {
        results.push({ siteId: schedule.site_id, status: 'error', error: err.message })
      }
    }

    return NextResponse.json({ scanned: results.length, results })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
