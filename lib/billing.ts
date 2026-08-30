import { unstable_cache } from 'next/cache'
import { createAdminSupabase } from './supabase/admin'
import type { Plan } from './stripe/server'

// Pro-tier feature gate. Called at render paths that ship Pro-only output
// (custom accent, verified badge, …) to decide whether to honor or drop the
// owner's setting. The check is value-coerced so callers can pass the raw
// `users.plan` column (string | null | undefined) without pre-narrowing.
export function isPro(plan: Plan | string | null | undefined): boolean {
  return plan === 'pro'
}

// "Active" subscription state: Stripe says the customer is paid up AND the
// current billing period hasn't ended yet. We accept past_due as a grace
// state — Stripe retries failed charges for up to a week, and locking users
// out immediately would punish people with a temporarily declined card.
const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due'])

export interface BillingState {
  plan: Plan | null
  status: string | null
  // True when the user can use paid features right now. Combines `plan` and
  // `subscription_status` and `current_period_end`.
  isActive: boolean
}

interface BillingRow {
  plan?: string | null
  subscription_status?: string | null
  current_period_end?: string | null
}

export function deriveBillingState(row: BillingRow | null | undefined): BillingState {
  if (!row) {
    return { plan: null, status: null, isActive: false }
  }

  const plan = (row.plan as Plan | null) ?? null
  const status = row.subscription_status ?? null
  const periodEnd = row.current_period_end ? new Date(row.current_period_end).getTime() : null
  const now = Date.now()

  // Active: a plan is set AND status indicates payment is current AND the
  // paid period hasn't ended yet. past_due is intentionally accepted as a
  // grace state — Stripe retries failed charges for ~a week, and locking
  // users out immediately would punish a temporarily declined card.
  const withinPeriod = periodEnd === null || periodEnd > now
  const isActive =
    !!plan && withinPeriod && (status === null || ACTIVE_STATUSES.has(status))

  return { plan, status, isActive }
}

// Fetches billing state for a user from the DB. Uses the admin (service_role)
// client because end-user roles (anon, authenticated) had SELECT on the
// billing columns revoked in migration 0007 — see lib/db-columns.ts. Only
// the derived state (plan, status, isActive) is returned to the caller, so
// it's safe to call on behalf of any visitor (e.g. to decide whether a public
// card carries the free-tier footer) without leaking the raw Stripe
// identifiers.
export async function getBillingState(userId: string): Promise<BillingState> {
  // Cached across requests so the public profile read doesn't hit the admin
  // client on every view. Billing only changes via the Stripe webhook, which
  // bumps the `billing-${userId}` tag (see app/api/billing/webhook); the 120s
  // TTL is a backstop. NB: cache the DERIVED state, not the raw row — the raw
  // Stripe identifiers must never reach a cache that a public render reads.
  const cached = unstable_cache(
    () => fetchBillingState(userId),
    [`billing-${userId}`],
    { tags: [`billing-${userId}`], revalidate: 120 },
  )
  return cached()
}

const NO_BILLING: BillingState = { plan: null, status: null, isActive: false }

async function fetchBillingState(userId: string): Promise<BillingState> {
  try {
    const admin = createAdminSupabase()
    const { data, error } = await admin
      .from('users')
      .select('plan, subscription_status, current_period_end')
      .eq('id', userId)
      .maybeSingle()
    if (error || !data) return NO_BILLING
    return deriveBillingState(data as BillingRow)
  } catch {
    // createAdminSupabase() throws when SUPABASE_SERVICE_ROLE_KEY is unset.
    // This runs in the public profile + pricing render path, so degrade to
    // "no subscription" rather than 500 the page. A missing key is a deploy
    // misconfig that other paths (checkout/webhook) will surface loudly.
    return NO_BILLING
  }
}
