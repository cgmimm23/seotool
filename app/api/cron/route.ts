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
    // Get all active sites with their schedule and user plan
    const { data: schedules, error } = await supabaseAdmin
      .from('scan_schedule')
      .select(`
        *,
        sites ( url ),
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

      const url = (schedule as any).sites?.url
      if (!url) continue

      try {
        const audit = await runSeoAudit(url)

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

        results.push({ siteId: schedule.site_id, status: 'scanned' })
      } catch (err: any) {
        results.push({ siteId: schedule.site_id, status: 'error', error: err.message })
      }
    }

    return NextResponse.json({ scanned: results.length, results })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
