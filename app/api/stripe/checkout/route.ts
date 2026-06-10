import { getStripe } from '@/lib/stripe'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { priceId, plan } = await req.json()
  if (!priceId) return NextResponse.json({ error: 'priceId required' }, { status: 400 })

  // Get or create Stripe customer
  const profile = await prisma.profiles.findUnique({
    where: { id: user.id },
    select: { stripe_customer_id: true, email: true },
  })

  let customerId = profile?.stripe_customer_id

  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: profile?.email || user.email || undefined,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id

    await prisma.profiles.update({
      where: { id: user.id },
      data: { stripe_customer_id: customerId },
    })
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
