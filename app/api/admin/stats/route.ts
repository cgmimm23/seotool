import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  // New signups in last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Admin route — intentionally cross-user (admin-gated by requireAdmin).
  const [
    totalUsers,
    activeUsers,
    totalSites,
    totalAudits,
    totalKeywords,
    recentSignups,
    planRows,
    newSignups30d,
  ] = await Promise.all([
    prisma.profiles.count(),
    prisma.profiles.count({ where: { status: 'active' } }),
    prisma.sites.count(),
    prisma.audit_reports.count(),
    prisma.keywords.count(),
    prisma.profiles.findMany({
      select: { id: true, email: true, full_name: true, plan: true, created_at: true },
      orderBy: { created_at: 'desc' },
      take: 10,
    }),
    prisma.profiles.groupBy({ by: ['plan'], _count: { plan: true } }),
    prisma.profiles.count({ where: { created_at: { gte: thirtyDaysAgo } } }),
  ])

  // Calculate plan breakdown
  const planCounts: Record<string, number> = { free: 0, starter: 0, pro: 0, agency: 0 }
  planRows.forEach((row) => {
    planCounts[row.plan] = (planCounts[row.plan] || 0) + row._count.plan
  })

  return NextResponse.json({
    totalUsers: totalUsers || 0,
    activeUsers: activeUsers || 0,
    totalSites: totalSites || 0,
    totalAudits: totalAudits || 0,
    totalKeywords: totalKeywords || 0,
    newSignups30d: newSignups30d || 0,
    recentSignups: recentSignups || [],
    planBreakdown: planCounts,
  })
}
