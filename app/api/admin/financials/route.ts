import { requireAdmin } from '@/lib/admin-auth'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const PLAN_PRICES: Record<string, number> = {
  free: 0,
  starter: 59.95,
  pro: 149,
  enterprise: 0,
}

export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const supabase = auth.supabase

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name, plan, status, created_at')

  const users = profiles || []

  // Revenue by plan
  const revenueByPlan: Record<string, { count: number; revenue: number }> = {}
  let mrr = 0
  let payingUsers = 0

  for (const plan of Object.keys(PLAN_PRICES)) {
    const planUsers = users.filter(u => u.plan === plan && u.status === 'active')
    const revenue = planUsers.length * PLAN_PRICES[plan]
    revenueByPlan[plan] = { count: planUsers.length, revenue }
    mrr += revenue
    if (PLAN_PRICES[plan] > 0) payingUsers += planUsers.length
  }

  // Paying subscribers list
  const subscribers = users
    .filter(u => u.plan !== 'free' && u.status === 'active')
    .map(u => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      plan: u.plan,
      monthlyRevenue: PLAN_PRICES[u.plan] || 0,
      since: u.created_at,
    }))

  return NextResponse.json({
    mrr,
    arr: mrr * 12,
    payingUsers,
    totalUsers: users.length,
    conversionRate: users.length > 0 ? ((payingUsers / users.length) * 100).toFixed(1) : '0',
    revenueByPlan,
    subscribers,
  })
}
