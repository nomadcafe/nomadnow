import { requireUser } from './supabase/server'
import { getBillingState } from './billing'
import { ForbiddenError } from './errors'

// Route-handler guard for the paid-only model: the caller must be signed in
// AND have an active paid plan (basic or pro, within the paid period). Use this
// on edit/write endpoints so a direct API call can't mutate a card that the
// user hasn't paid to keep live. Throws UnauthorizedError (via requireUser) or
// ForbiddenError.
//
// Lives in its own server-only module (not lib/billing.ts) because billing.ts
// is imported by client components for the pure isPro() helper — pulling
// requireUser (which imports next/headers) into that module poisons the client
// bundle.
//
// NB: do NOT put this on the create-card onboarding writes. A brand-new user
// claims a handle and seeds their card BEFORE paying (see useSubmitCard +
// app/create-card) — gating those would break the funnel. Onboarding-shared
// endpoints (POST /api/users, PUT /api/nomad-links, /api/blurbs,
// /api/featured-works, /api/stays, avatar upload) stay open; the public render
// path and the /edit shell are what actually hide/lock an unpaid card.
export async function requireActivePlan() {
  const { supabase, user } = await requireUser()
  const billing = await getBillingState(user.id)
  if (!billing.isActive) {
    throw new ForbiddenError('An active subscription is required')
  }
  return { supabase, user, billing }
}
