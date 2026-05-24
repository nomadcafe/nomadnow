import Stripe from 'stripe'

// Single-instance Stripe client. Pin the API version explicitly so
// dependency upgrades don't silently shift webhook payload shapes — when we
// want a newer Stripe API, the bump is intentional and reviewable.
let cached: Stripe | null = null

export function getStripe(): Stripe {
  if (cached) return cached
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  // Intentionally don't pin apiVersion — the Stripe SDK ships its own default
  // that matches the bundled types, so omitting this keeps webhook payload
  // shape and SDK types in sync. The account's default API version applies.
  cached = new Stripe(key, {
    typescript: true,
    appInfo: {
      name: 'Nomad.now',
      version: '0.1.0',
    },
  })
  return cached
}

// True when all required Stripe env vars are present. Routes use this to
// fail fast with 503 instead of throwing deep in the SDK.
export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET &&
      process.env.STRIPE_PRICE_BASIC &&
      process.env.STRIPE_PRICE_PRO,
  )
}

export type Plan = 'basic' | 'pro'

export function priceIdForPlan(plan: Plan): string {
  if (plan === 'basic') {
    const id = process.env.STRIPE_PRICE_BASIC
    if (!id) throw new Error('STRIPE_PRICE_BASIC is not configured')
    return id
  }
  const id = process.env.STRIPE_PRICE_PRO
  if (!id) throw new Error('STRIPE_PRICE_PRO is not configured')
  return id
}

// Reverse lookup — webhook receives a Stripe price ID and we need to know
// which of our plans it represents. Returns null for unknown prices (legacy
// products, deleted prices) so the caller can refuse to apply them.
export function planForPriceId(priceId: string): Plan | null {
  if (priceId === process.env.STRIPE_PRICE_BASIC) return 'basic'
  if (priceId === process.env.STRIPE_PRICE_PRO) return 'pro'
  return null
}
