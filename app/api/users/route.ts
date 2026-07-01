import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/supabase/server'
import { requireActivePlan } from '@/lib/billing'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getStripe, isStripeConfigured, planForPriceId, type Plan } from '@/lib/stripe/server'
import { ValidationError, formatErrorResponse, logError } from '@/lib/errors'
import { isReservedHandle } from '@/lib/reserved-handles'
import { bumpProfileCache, bumpBillingCache, bumpExploreCache } from '@/lib/revalidate'
import { SAFE_USER_COLUMNS } from '@/lib/db-columns'
import { safeLinkUrlSchema } from '@/lib/validation'
import { assertUrlsSafe } from '@/lib/safe-browsing'

// Reused on both create and update — keep them in lockstep so the form can
// submit the same shape regardless of mode.
// Label is the button text (e.g. "Hire me", "Book intro call"); url accepts
// http/https/mailto/tel via the same allow-list as nomad_links.
const hireCtaLabelSchema = z.string().max(30).nullable().optional().or(z.literal(''))
const hireCtaUrlSchema = safeLinkUrlSchema.nullable().optional().or(z.literal(''))
// Meetup CTA — same shape and validation as hire_cta. Twin field on users.
const meetupCtaLabelSchema = z.string().max(30).nullable().optional().or(z.literal(''))
const meetupCtaUrlSchema = safeLinkUrlSchema.nullable().optional().or(z.literal(''))
// now_text — the one-line "now" headline. 140 chars matches the DB CHECK
// (migration 0029) and the client maxLength. nullable so the edit form can
// clear it; '' accepted and coerced to null at write time.
const nowTextSchema = z.string().max(140).nullable().optional().or(z.literal(''))

// Commercial availability (migration 0031). Enum mirrors the DB CHECK; ''
// accepted from the edit form's "Not showing" option and coerced to null at
// write time (so clearing the select wipes the column, like nomad_since).
const availabilitySchema = z.enum(['open', 'booked']).nullable().optional().or(z.literal(''))

// nomad_since: YYYY-MM-DD ISO date. Form is a month picker, so day is
// always 01. Range matches the DB CHECK constraint in migration 0023 —
// anything before 2000 or in the future is a typo, not a real value.
// Empty string accepted so users can clear the field from the edit form.
const nomadSinceSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date')
  .refine(
    (v) => {
      const t = Date.parse(v)
      if (Number.isNaN(t)) return false
      const min = Date.parse('2000-01-01')
      return t >= min && t <= Date.now()
    },
    { message: 'Date out of range' },
  )
  .nullable()
  .optional()
  .or(z.literal(''))

const createUserSchema = z.object({
  handle: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/, 'Handle can only contain letters, numbers, underscores, and hyphens'),
  display_name: z.string().max(100).optional(),
  // safeLinkUrlSchema (not bare .url()) so a javascript:/data: URL can't be
  // stored and later fed into an <img src> or the JSON-LD `image` field.
  avatar_url: safeLinkUrlSchema.optional().or(z.literal('')),
  country: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  // safeLinkUrlSchema (not bare .url()) so a `javascript:`/`data:` website
  // can't be stored and later rendered as an href. Same allow-list as links.
  website: safeLinkUrlSchema.optional().or(z.literal('')),
  role: z.string().max(100).optional(),
  current_city: z.string().max(100).optional(),
  // Free-form string up to 60 chars. Preset slugs (busy, freelancing,
  // fulltime) get translated by NomadCard; anything else renders verbatim
  // so users can write custom statuses like "slow travel mode".
  work_status: z.string().max(60).optional().or(z.literal('')),
  timezone: z.string().max(50).optional(),
  visited_countries: z.array(z.string()).optional(),
  nomad_since: nomadSinceSchema,
  open_to_coffee: z.boolean().optional(),
  availability: availabilitySchema,
  now_text: nowTextSchema,
  profile_type: z.enum(['creator', 'nomad', 'both']).optional(),
  hire_cta_label: hireCtaLabelSchema,
  hire_cta_url: hireCtaUrlSchema,
  meetup_cta_label: meetupCtaLabelSchema,
  meetup_cta_url: meetupCtaUrlSchema,
})

const updateUserSchema = z.object({
  display_name: z.string().max(100).optional(),
  // safeLinkUrlSchema (not bare .url()) so a javascript:/data: URL can't be
  // stored and later fed into an <img src> or the JSON-LD `image` field.
  avatar_url: safeLinkUrlSchema.optional().or(z.literal('')),
  country: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  // safeLinkUrlSchema (not bare .url()) so a `javascript:`/`data:` website
  // can't be stored and later rendered as an href. Same allow-list as links.
  website: safeLinkUrlSchema.optional().or(z.literal('')),
  role: z.string().max(100).optional(),
  current_city: z.string().max(100).optional(),
  // Free-form string up to 60 chars. Preset slugs (busy, freelancing,
  // fulltime) get translated by NomadCard; anything else renders verbatim
  // so users can write custom statuses like "slow travel mode".
  work_status: z.string().max(60).optional().or(z.literal('')),
  timezone: z.string().max(50).optional(),
  visited_countries: z.array(z.string()).optional(),
  nomad_since: nomadSinceSchema,
  open_to_coffee: z.boolean().optional(),
  availability: availabilitySchema,
  now_text: nowTextSchema,
  profile_type: z.enum(['creator', 'nomad', 'both']).optional(),
  hire_cta_label: hireCtaLabelSchema,
  hire_cta_url: hireCtaUrlSchema,
  meetup_cta_label: meetupCtaLabelSchema,
  meetup_cta_url: meetupCtaUrlSchema,
})

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser()
    const body = await request.json()

    const validation = createUserSchema.safeParse(body)
    if (!validation.success) {
      throw new ValidationError('Invalid user data', validation.error.errors)
    }

    if (isReservedHandle(validation.data.handle)) {
      throw new ValidationError('Handle is reserved', { handle: 'This handle is reserved' })
    }

    // Reject known-malicious CTA / website links (fail-open; render-time scrub
    // in lib/profile.ts is the backstop). Non-string / mailto / tel values are
    // ignored inside findUnsafeUrls.
    await assertUrlsSafe(
      [validation.data.hire_cta_url, validation.data.meetup_cta_url, validation.data.website].filter(
        (u): u is string => typeof u === 'string' && u.length > 0,
      ),
    )

    const { data, error } = await supabase
      .from('users')
      .insert({
        id: user.id,
        handle: validation.data.handle,
        display_name: validation.data.display_name,
        avatar_url: validation.data.avatar_url || null,
        country: validation.data.country,
        bio: validation.data.bio,
        website: validation.data.website || null,
        role: validation.data.role || null,
        current_city: validation.data.current_city || null,
        work_status: validation.data.work_status || null,
        timezone: validation.data.timezone || null,
        visited_countries: validation.data.visited_countries || null,
        nomad_since: validation.data.nomad_since || null,
        // The "now" layer starts ticking at signup: claiming a handle with a
        // city is itself a fresh presence assertion. Stamped server-side only
        // (never from the body) so freshness can't be backdated. See 0028.
        presence_confirmed_at: new Date().toISOString(),
        // Column is NOT NULL with DEFAULT FALSE — omit when not specified
        // so the DB default wins instead of writing a misleading explicit
        // false (no-op in effect, but makes intent clearer in audit logs).
        ...(validation.data.open_to_coffee !== undefined
          ? { open_to_coffee: validation.data.open_to_coffee }
          : {}),
        // '' / undefined → null so a card created without an availability
        // pick leaves the column NULL (no chip) rather than a bogus value.
        availability: validation.data.availability || null,
        now_text: validation.data.now_text || null,
        profile_type: validation.data.profile_type || 'creator',
        // CTAs the form may have submitted on first-time create. Previously
        // dropped here (only PUT applied them), forcing users to save the
        // card once and then edit to get their Hire / Meetup buttons live.
        hire_cta_label: validation.data.hire_cta_label || null,
        hire_cta_url: validation.data.hire_cta_url || null,
        meetup_cta_label: validation.data.meetup_cta_label || null,
        meetup_cta_url: validation.data.meetup_cta_url || null,
      })
      // Explicit column list — '.select()' (no args) returns every column
      // and would fail RETURNING because session role lacks SELECT on the
      // billing columns (see migration 0007).
      .select(SAFE_USER_COLUMNS)
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new ValidationError('Handle already exists', { handle: 'This handle is already taken' })
      }
      logError(error, { operation: 'create_user', handle: validation.data.handle })
      throw error
    }

    // If the user already paid before claiming a handle, the webhook's UPDATE
    // matched 0 rows (this row didn't exist yet) and the subscription state
    // is "lost" in Stripe — paid but not associated with any user row.
    // Recover it here: ask Stripe for any active subscription whose metadata
    // user_id matches this user, then copy plan/status onto the freshly
    // created row. Idempotent: if no such sub exists, this is a no-op.
    let userRow = data
    try {
      const recovered = await recoverOrphanSubscription(user.id)
      if (recovered) {
        userRow = recovered as typeof data
        // Recovery wrote plan/status onto the row — invalidate the billing
        // cache so the new card reflects the subscription immediately.
        bumpBillingCache(user.id)
      }
    } catch (err) {
      // Don't fail card creation just because Stripe recovery hit a transient
      // error — the user can resubscribe via /pricing and the webhook will
      // pick up the new state.
      logError(err, { operation: 'recover_orphan_subscription', userId: user.id })
    }

    bumpProfileCache(validation.data.handle)
    bumpExploreCache() // new card joins the directory
    return NextResponse.json({ success: true, user: userRow })
  } catch (error) {
    logError(error, { operation: 'create_user' })
    const errorResponse = formatErrorResponse(error)
    return NextResponse.json(
      { error: errorResponse.error, code: errorResponse.code, details: errorResponse.details },
      { status: errorResponse.statusCode }
    )
  }
}

// Look up any Stripe subscription tagged with this user_id in metadata and,
// if found, apply plan/status/period to the user row. Run after a fresh
// public.users INSERT to recover subscriptions that were paid BEFORE the row
// existed (the webhook UPDATE matched 0 rows; nothing else picks them up).
//
// We search subscriptions rather than the user-row's customer ID because at
// this point we may not have a customer ID stored (the older checkout flow
// would only have written it back on a path that the orphan flow skipped).
// Stripe's subscription search is rate-limited but cheap enough for a
// once-per-account event.
async function recoverOrphanSubscription(userId: string): Promise<unknown | null> {
  if (!isStripeConfigured()) return null

  const stripe = getStripe()
  const result = await stripe.subscriptions.search({
    query: `metadata['user_id']:'${userId}' AND status:'active'`,
    limit: 1,
  })
  const sub = result.data[0]
  if (!sub) return null

  let plan: Plan | null = null
  let maxPeriodEnd = 0
  for (const item of sub.items.data) {
    const priceId = item.price?.id
    if (priceId && !plan) {
      const matched = planForPriceId(priceId)
      if (matched) plan = matched
    }
    const end = item.current_period_end
    if (typeof end === 'number' && end > maxPeriodEnd) {
      maxPeriodEnd = end
    }
  }

  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
  const admin = createAdminSupabase()
  const { data } = await admin
    .from('users')
    .update({
      stripe_customer_id: customerId,
      subscription_id: sub.id,
      subscription_status: sub.status,
      current_period_end: maxPeriodEnd > 0
        ? new Date(maxPeriodEnd * 1000).toISOString()
        : null,
      plan,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    // Admin client bypasses the column-level GRANT — but the returned row
    // is forwarded to the client as `user`, so we explicitly drop billing
    // identifiers here too. SAFE_USER_COLUMNS includes `plan`, which the
    // UI needs to render the post-payment state correctly.
    .select(SAFE_USER_COLUMNS)
    .single()
  return data
}

export async function PUT(request: NextRequest) {
  try {
    // Paid-only model: editing an existing profile requires an active plan.
    // The POST create path stays on requireUser so a brand-new user can still
    // claim a handle / seed their card before paying (see useSubmitCard).
    const { supabase, user } = await requireActivePlan()
    const body = await request.json()

    const validation = updateUserSchema.safeParse(body)
    if (!validation.success) {
      throw new ValidationError('Invalid update data', validation.error.errors)
    }

    const cleanData = Object.fromEntries(
      Object.entries(validation.data).filter(([, v]) => v !== undefined)
    )
    // nomad_since is a DATE column — empty string would fail at PG. Coerce
    // '' → null so users can clear the field from the edit form by emptying
    // the month picker.
    if (cleanData.nomad_since === '') cleanData.nomad_since = null
    // availability is an enum/null column — '' (the form's "Not showing"
    // option) would fail the CHECK, so coerce it to null to clear the chip.
    if (cleanData.availability === '') cleanData.availability = null

    // Any profile save refreshes the "now" layer. Opening the editor and
    // saving is an active "this card is current" signal, so the freshness note
    // should read "today" right after — the earlier rule (only re-stamp when
    // city/now_text changed) surprised users who'd just saved yet saw "13 days
    // ago". The decay only exists to catch ABANDONED cards; an active save is
    // the opposite of abandonment. Refreshing without editing still has the
    // one-tap /api/users/confirm-presence path.
    cleanData.presence_confirmed_at = new Date().toISOString()

    // Re-scan CTA / website links on edit too (fail-open; see POST).
    await assertUrlsSafe(
      [cleanData.hire_cta_url, cleanData.meetup_cta_url, cleanData.website].filter(
        (u): u is string => typeof u === 'string' && u.length > 0,
      ),
    )

    const { data, error } = await supabase
      .from('users')
      .update({
        ...cleanData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select(SAFE_USER_COLUMNS)
      .single()

    if (error) {
      logError(error, { operation: 'update_user', userId: user.id })
      throw error
    }

    if (!data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (data.handle) bumpProfileCache(data.handle as string)
    bumpExploreCache() // edited fields (name/role/city/bio/countries) show in the directory
    return NextResponse.json({ success: true, user: data })
  } catch (error) {
    logError(error, { operation: 'update_user' })
    const errorResponse = formatErrorResponse(error)
    return NextResponse.json(
      { error: errorResponse.error, code: errorResponse.code, details: errorResponse.details },
      { status: errorResponse.statusCode }
    )
  }
}
