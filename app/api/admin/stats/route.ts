import { requireAdmin } from '@/lib/admin-auth'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const supabase = auth.supabase

  const [
    profilesRes,
    activeRes,
    sitesRes,
    auditsRes,
    keywordsRes,
    recentSignupsRes,
    planBreakdownRes,
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact' }),
    supabase.from('profiles').select('id', { count: 'exact' }).eq('status', 'active'),
    supabase.from('sites').select('id', { count: 'exact' }),
    supabase.from('audit_reports').select('id', { count: 'exact' }),
    supabase.from('keywords').select('id', { count: 'exact' }),
    supabase.from('profiles').select('id, email, full_name, plan, created_at')
      .order('created_at', { ascending: false }).limit(10),
    supabase.from('profiles').select('plan'),
  ])

  // Calculate plan breakdown
  const planCounts: Record<string, number> = { free: 0, starter: 0, pro: 0, agency: 0 }
  planBreakdownRes.data?.forEach((p: any) => {
    planCounts[p.plan] = (planCounts[p.plan] || 0) + 1
  })

  // New signups in last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const { count: newSignups30d } = await supabase
    .from('profiles')
    .select('id', { count: 'exact' })
    .gte('created_at', thirtyDaysAgo.toISOString())

  return NextResponse.json({
    totalUsers: profilesRes.count || 0,
    activeUsers: activeRes.count || 0,
    totalSites: sitesRes.count || 0,
    totalAudits: auditsRes.count || 0,
    totalKeywords: keywordsRes.count || 0,
    newSignups30d: newSignups30d || 0,
    recentSignups: recentSignupsRes.data || [],
    planBreakdown: planCounts,
  })
}
