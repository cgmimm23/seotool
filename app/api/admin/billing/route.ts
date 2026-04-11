import { requireAdmin } from '@/lib/admin-auth'
import { getStripe } from '@/lib/stripe'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Our product IDs
const OUR_PRODUCTS = ['prod_UJVyF4X2VbuNAc', 'prod_UJVzmq7hhM9JiT']

export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const supabase = auth.supabase

  // Get all paying users from our database
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name, plan, stripe_customer_id, stripe_subscription_id, subscription_cancel_at, created_at')

  const users = profiles || []
  const subscribers = users.filter(u => u.stripe_subscription_id)

  // Get our Stripe subscriptions only
  let activeSubCount = 0
  let mrr = 0
  try {
    const subs = await getStripe().subscriptions.list({ status: 'active', limit: 100 })
    const ourSubs = subs.data.filter(s => {
      const productId = s.items.data[0]?.price?.product
      return OUR_PRODUCTS.includes(productId as string)
    })
    activeSubCount = ourSubs.length
    mrr = ourSubs.reduce((sum, s) => {
      const item = s.items.data[0]
      return sum + (item?.price?.unit_amount || 0) / 100
    }, 0)
  } catch (err) {
    console.error('Failed to fetch Stripe subscriptions:', err)
  }

  // Get recent charges for our products only
  let recentCharges: any[] = []
  try {
    const charges = await getStripe().charges.list({ limit: 50 })
    // Filter to charges from our customers
    const ourCustomerIds = new Set(users.filter(u => u.stripe_customer_id).map(u => u.stripe_customer_id))

    recentCharges = charges.data
      .filter(c => ourCustomerIds.has(c.customer as string))
      .slice(0, 25)
      .map(c => ({
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
