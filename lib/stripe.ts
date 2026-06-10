import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // Cast keeps this pinned API version valid across floating Stripe SDK
      // minor versions (the apiVersion literal type changes between releases).
      apiVersion: '2026-03-25.dahlia' as any,
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
