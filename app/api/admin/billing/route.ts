import { requireAdmin } from '@/lib/admin-auth'
import { getStripe } from '@/lib/stripe'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const supabase = auth.supabase

  // Get all paying users
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name, plan, stripe_customer_id, stripe_subscription_id, subscription_cancel_at, created_at')

  const users = profiles || []
  const subscribers = users.filter(u => u.stripe_subscription_id)

  // Get recent Stripe charges
  let recentCharges: any[] = []
  try {
    const charges = await getStripe().charges.list({ limit: 25 })
    recentCharges = charges.data.map(c => ({
      id: c.id,
      amount: c.amount / 100,
      currency: c.currency,
      status: c.status,
      customer: c.customer,
      email: c.billing_details?.email || c.receipt_email,
      created: new Date(c.created * 1000).toISOString(),
    }))
  } catch (err) {
    console.error('Failed to fetch Stripe charges:', err)
  }

  // Get active subscriptions count from Stripe
  let activeSubCount = 0
  let mrr = 0
  try {
    const subs = await getStripe().subscriptions.list({ status: 'active', limit: 100 })
    activeSubCount = subs.data.length
    mrr = subs.data.reduce((sum, s) => {
      const item = s.items.data[0]
      return sum + (item?.price?.unit_amount || 0) / 100
    }, 0)
  } catch (err) {
    console.error('Failed to fetch Stripe subscriptions:', err)
  }

  return NextResponse.json({
    activeSubscriptions: activeSubCount,
    mrr,
    arr: mrr * 12,
    totalSubscribers: subscribers.length,
    recentCharges,
    subscribers: subscribers.map(u => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      plan: u.plan,
      stripe_customer_id: u.stripe_customer_id,
      cancel_at: u.subscription_cancel_at,
    })),
  })
}
