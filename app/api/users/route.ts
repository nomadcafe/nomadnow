import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getStripe, isStripeConfigured, planForPriceId, type Plan } from '@/lib/stripe/server'
import { ValidationError, formatErrorResponse, logError } from '@/lib/errors'
import { isReservedHandle } from '@/lib/reserved-handles'
import { bumpProfileCache } from '@/lib/revalidate'

const createUserSchema = z.object({
  handle: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/, 'Handle can only contain letters, numbers, underscores, and hyphens'),
  display_name: z.string().max(100).optional(),
  avatar_url: z.string().url().optional().or(z.literal('')),
  country: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  website: z.string().url().optional().or(z.literal('')),
  location: z.string().max(100).optional(),
  role: z.string().max(100).optional(),
  current_city: z.string().max(100).optional(),
  // Free-form string up to 60 chars. Preset slugs (busy, freelancing,
  // fulltime) get translated by NomadCard; anything else renders verbatim
  // so users can write custom statuses like "slow travel mode".
  work_status: z.string().max(60).optional().or(z.literal('')),
  timezone: z.string().max(50).optional(),
  visited_countries: z.array(z.string()).optional(),
  profile_type: z.enum(['creator', 'nomad', 'both']).optional(),
})

const updateUserSchema = z.object({
  display_name: z.string().max(100).optional(),
  avatar_url: z.string().url().optional().or(z.literal('')),
  country: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  website: z.string().url().optional().or(z.literal('')),
  location: z.string().max(100).optional(),
  role: z.string().max(100).optional(),
  current_city: z.string().max(100).optional(),
  // Free-form string up to 60 chars. Preset slugs (busy, freelancing,
  // fulltime) get translated by NomadCard; anything else renders verbatim
  // so users can write custom statuses like "slow travel mode".
  work_status: z.string().max(60).optional().or(z.literal('')),
  timezone: z.string().max(50).optional(),
  visited_countries: z.array(z.string()).optional(),
  profile_type: z.enum(['creator', 'nomad', 'both']).optional(),
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
        location: validation.data.location,
        role: validation.data.role || null,
        current_city: validation.data.current_city || null,
        work_status: validation.data.work_status || 'available',
        timezone: validation.data.timezone || null,
        visited_countries: validation.data.visited_countries || null,
        profile_type: validation.data.profile_type || 'creator',
      })
      .select()
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
      if (recovered) userRow = recovered
    } catch (err) {
      // Don't fail card creation just because Stripe recovery hit a transient
      // error — the user can resubscribe via /pricing and the webhook will
      // pick up the new state.
      logError(err, { operation: 'recover_orphan_subscription', userId: user.id })
    }

    bumpProfileCache(validation.data.handle)
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
    .select()
    .single()
  return data
}

export async function PUT(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser()
    const body = await request.json()

    const validation = updateUserSchema.safeParse(body)
    if (!validation.success) {
      throw new ValidationError('Invalid update data', validation.error.errors)
    }

    const cleanData = Object.fromEntries(
      Object.entries(validation.data).filter(([, v]) => v !== undefined)
    )

    const { data, error } = await supabase
      .from('users')
      .update({
        ...cleanData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      logError(error, { operation: 'update_user', userId: user.id })
      throw error
    }

    if (!data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (data.handle) bumpProfileCache(data.handle as string)
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
