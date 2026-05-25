import { createAdminSupabase } from './supabase/admin'
import type { Plan } from './stripe/server'

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
  // True when subscription was canceled AND the paid period has ended. Used to
  // hard-gate the public profile to "no longer available".
  isExpired: boolean
}

interface BillingRow {
  plan?: string | null
  subscription_status?: string | null
  current_period_end?: string | null
}

export function deriveBillingState(row: BillingRow | null | undefined): BillingState {
  if (!row) {
    return { plan: null, status: null, isActive: false, isExpired: false }
  }

  const plan = (row.plan as Plan | null) ?? null
  const status = row.subscription_status ?? null
  const periodEnd = row.current_period_end ? new Date(row.current_period_end).getTime() : null
  const now = Date.now()

  // Expired: the subscription was canceled and the paid period has lapsed.
  // We can't gate this on `plan` because the webhook clears `plan` to null
  // once the period ends — then this would be indistinguishable from a user
  // who never subscribed at all. `subscription_status` is the source of truth
  // for "was once a customer".
  const isExpired = status === 'canceled' && periodEnd !== null && periodEnd <= now

  // Active: a plan is set AND status indicates payment is current AND the
  // paid period hasn't ended yet. past_due is intentionally accepted as a
  // grace state — Stripe retries failed charges for ~a week, and locking
  // users out immediately would punish a temporarily declined card.
  const withinPeriod = periodEnd === null || periodEnd > now
  const isActive =
    !!plan && withinPeriod && (status === null || ACTIVE_STATUSES.has(status))

  return { plan, status, isActive, isExpired }
}

// Fetches billing state for a user from the DB. Uses the admin (service_role)
// client because end-user roles (anon, authenticated) had SELECT on the
// billing columns revoked in migration 0007 — see lib/db-columns.ts. Only
// the derived state (plan, status, isActive, isExpired) is returned to the
// caller, so it's safe to call on behalf of any visitor (e.g. to gate a
// public profile page on the OWNER's subscription) without leaking the
// raw Stripe identifiers.
export async function getBillingState(userId: string): Promise<BillingState> {
  const admin = createAdminSupabase()
  const { data, error } = await admin
    .from('users')
    .select('plan, subscription_status, current_period_end')
    .eq('id', userId)
    .maybeSingle()
  if (error || !data) {
    return { plan: null, status: null, isActive: false, isExpired: false }
  }
  return deriveBillingState(data as BillingRow)
}
