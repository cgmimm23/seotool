import { getStripe } from '@/lib/stripe'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  let event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as any
      const userId = session.metadata?.supabase_user_id
      const plan = session.metadata?.plan

      if (userId && plan) {
        await prisma.profiles.updateMany({
          where: { id: userId },
          data: {
            plan,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            updated_at: new Date(),
          },
        })
      }
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as any
      const userId = subscription.metadata?.supabase_user_id
      const plan = subscription.metadata?.plan

      if (userId) {
        const updates: Record<string, any> = {
          stripe_subscription_id: subscription.id,
          updated_at: new Date(),
        }

        if (subscription.status === 'active' && plan) {
          updates.plan = plan
        }

        if (subscription.cancel_at_period_end) {
          updates.subscription_cancel_at = new Date(subscription.current_period_end * 1000)
        } else {
          updates.subscription_cancel_at = null
        }

        await prisma.profiles.updateMany({ where: { id: userId }, data: updates })
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as any
      const userId = subscription.metadata?.supabase_user_id

      if (userId) {
        await prisma.profiles.updateMany({
          where: { id: userId },
          data: {
            plan: 'free',
            stripe_subscription_id: null,
            subscription_cancel_at: null,
            updated_at: new Date(),
          },
        })
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as any
      const customerId = invoice.customer

      // Find user by Stripe customer ID
      const profile = await prisma.profiles.findFirst({
        where: { stripe_customer_id: customerId },
        select: { id: true },
      })

      if (profile) {
        // Log the failed payment — could also send notification
        console.error(`Payment failed for user ${profile.id}, invoice ${invoice.id}`)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
