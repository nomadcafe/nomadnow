import type { SupabaseClient } from '@supabase/supabase-js'
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
  if (!row || !row.plan) {
    return { plan: null, status: null, isActive: false, isExpired: false }
  }
  const status = row.subscription_status ?? null
  const periodEnd = row.current_period_end ? new Date(row.current_period_end).getTime() : null
  const now = Date.now()

  const withinPeriod = periodEnd === null || periodEnd > now
  const isActive = withinPeriod && (status === null || ACTIVE_STATUSES.has(status))
  const isExpired = status === 'canceled' && periodEnd !== null && periodEnd <= now

  return {
    plan: row.plan as Plan,
    status,
    isActive,
    isExpired,
  }
}

// Fetches billing state for an authenticated user from the DB. Pass a
// session-scoped Supabase client so RLS applies — admin queries should use
// supabaseAdmin directly with the columns instead.
export async function getBillingState(
  supabase: SupabaseClient,
  userId: string,
): Promise<BillingState> {
  const { data, error } = await supabase
    .from('users')
    .select('plan, subscription_status, current_period_end')
    .eq('id', userId)
    .maybeSingle()
  if (error || !data) {
    return { plan: null, status: null, isActive: false, isExpired: false }
  }
  return deriveBillingState(data as BillingRow)
}
