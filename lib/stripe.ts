import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-03-25.dahlia',
    })
  }
  return _stripe
}

export const PLANS = {
  starter: {
    name: 'Starter',
    price: 5995,
    sites: 1,
    interval: 'month' as const,
  },
  pro: {
    name: 'Pro',
    price: 14900,
    sites: 5,
    interval: 'month' as const,
  },
}
