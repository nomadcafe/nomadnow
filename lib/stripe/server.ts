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
export type BillingInterval = 'monthly' | 'yearly'

// Env var carrying the Stripe price ID for a (plan, interval) pair. Monthly
// keeps the original names (STRIPE_PRICE_BASIC / _PRO) for backward compat;
// yearly adds the _YEARLY suffix. Kept as one map so the checkout, webhook
// reverse-lookup, and "is yearly wired?" check all read the same source.
const PRICE_ENV: Record<Plan, Record<BillingInterval, string>> = {
  basic: { monthly: 'STRIPE_PRICE_BASIC', yearly: 'STRIPE_PRICE_BASIC_YEARLY' },
  pro: { monthly: 'STRIPE_PRICE_PRO', yearly: 'STRIPE_PRICE_PRO_YEARLY' },
}

export function priceIdForPlan(plan: Plan, interval: BillingInterval = 'monthly'): string {
  const envName = PRICE_ENV[plan][interval]
  const id = process.env[envName]
  if (!id) throw new Error(`${envName} is not configured`)
  return id
}

// True when both yearly price IDs are present. The UI uses this to decide
// whether to show the monthly/yearly toggle, and the checkout route uses it to
// reject a yearly request on a deployment that hasn't wired the annual prices.
export function isYearlyBillingConfigured(): boolean {
  return Boolean(process.env.STRIPE_PRICE_BASIC_YEARLY && process.env.STRIPE_PRICE_PRO_YEARLY)
}

// Reverse lookup — webhook receives a Stripe price ID and we need to know
// which of our plans it represents. Matches both the monthly and yearly price
// for each plan (the stored `plan` value is interval-agnostic — 'basic' or
// 'pro' — since features gate on plan, not billing cadence). Returns null for
// unknown prices (legacy products, deleted prices) so the caller can refuse to
// apply them.
export function planForPriceId(priceId: string): Plan | null {
  for (const plan of ['basic', 'pro'] as const) {
    for (const interval of ['monthly', 'yearly'] as const) {
      if (priceId === process.env[PRICE_ENV[plan][interval]]) return plan
    }
  }
  return null
}
