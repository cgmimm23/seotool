import { getStripe, PLANS } from '@/lib/stripe'
import { requireAdmin } from '@/lib/admin-auth'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// One-time setup: creates Stripe products and prices
// Run once via admin: POST /api/stripe/setup
export async function POST() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const results: Record<string, any> = {}

  for (const [key, plan] of Object.entries(PLANS)) {
    // Create product
    const product = await getStripe().products.create({
      name: `SEO by CGMIMM — ${plan.name}`,
      metadata: { plan_key: key },
    })

    // Create price
    const price = await getStripe().prices.create({
      product: product.id,
      unit_amount: plan.price,
      currency: 'usd',
      recurring: { interval: plan.interval },
      metadata: { plan_key: key },
    })

    results[key] = { product_id: product.id, price_id: price.id }
  }

  return NextResponse.json({
    message: 'Stripe products created. Save these price IDs in your environment.',
    results,
  })
}
