import { getStripe } from '@/lib/stripe'
import { createServerSupabase } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { priceId, plan } = await req.json()
  if (!priceId) return NextResponse.json({ error: 'priceId required' }, { status: 400 })

  // Get or create Stripe customer
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, email')
    .eq('id', user.id)
    .single()

  let customerId = profile?.stripe_customer_id

  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: profile?.email || user.email,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id

    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id)
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://seo.cgmimm.com'

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}/dashboard/settings?upgraded=true`,
    cancel_url: `${siteUrl}/dashboard/settings?cancelled=true`,
    metadata: {
      supabase_user_id: user.id,
      plan: plan || '',
    },
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
        plan: plan || '',
      },
    },
  })

  return NextResponse.json({ url: session.url })
}
