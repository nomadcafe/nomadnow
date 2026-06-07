import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireUser } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getStripe, isStripeConfigured, planForPriceId, type Plan } from '@/lib/stripe/server'
import { logError } from '@/lib/errors'
import { bumpBillingCache, bumpProfileCache } from '@/lib/revalidate'

// Resolves the race between the Stripe Checkout redirect (which the user hits
// ~3–5s after paying) and the customer.subscription.created webhook (which
// usually arrives within 1–2s but isn't guaranteed). Without this, a fast
// user lands on /create-card before the webhook fires, the plan-gate sees
// plan=null, and they get bounced to /pricing — which looks like "the
// payment failed" even though it didn't.
//
// We do the same DB write the webhook would do, idempotently. If the webhook
// already ran, this is a no-op overwrite with identical values.

function getBaseUrl(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  if (forwardedHost && process.env.NODE_ENV !== 'development') {
    return `${proto}://${forwardedHost}`
  }
  return process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
}

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request)
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('session_id')

  if (!sessionId) {
    return NextResponse.redirect(`${baseUrl}/pricing`)
  }

  try {
    if (!isStripeConfigured()) {
      // Misconfigured deployment — best we can do is send them to /pricing
      // rather than a half-baked /create-card flow.
      return NextResponse.redirect(`${baseUrl}/pricing`)
    }

    const { user } = await requireUser()
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    })

    // Guard against someone replaying another user's session_id in the URL.
    const sessionUserId = session.client_reference_id || session.metadata?.user_id
    if (!sessionUserId || sessionUserId !== user.id) {
      logError(new Error('Checkout session user mismatch'), {
        sessionId,
        currentUser: user.id,
        sessionUser: sessionUserId,
      })
      return NextResponse.redirect(`${baseUrl}/pricing`)
    }

    // Decide where to send the user *after* writing plan to DB. If they
    // already have a handle they should land on their public card; if not,
    // they still need to claim one via /create-card. Looking this up before
    // the redirect keeps the post-payment flow consistent with the rest of
    // the app's "handle-first" assumption.
    const { data: existing } = await createAdminSupabase()
      .from('users')
      .select('handle')
      .eq('id', user.id)
      .maybeSingle()
    const landingPath = existing?.handle
      ? `/${existing.handle as string}?checkout=success`
      : '/create-card?checkout=success'

    const sub = session.subscription
    if (sub && typeof sub !== 'string') {
      // Pull the same fields the webhook handler does (single source of
      // truth is intentionally minor duplication — keeping this independent
      // means a webhook-secret outage doesn't leave Checkout broken).
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
      const currentPeriodEnd = maxPeriodEnd > 0
        ? new Date(maxPeriodEnd * 1000).toISOString()
        : null
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id

      const admin = createAdminSupabase()
      await admin
        .from('users')
        .update({
          stripe_customer_id: customerId,
          subscription_id: sub.id,
          subscription_status: sub.status,
          plan,
          current_period_end: currentPeriodEnd,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      // Invalidate the caches this write touches, or the whole point of this
      // route — beating the webhook so the just-paid user sees their plan
      // immediately — is defeated: getBillingState (120s) and the profile's
      // `plan` (60s) would serve a pre-payment `plan:null` until the TTL.
      bumpBillingCache(user.id)
      if (existing?.handle) bumpProfileCache(existing.handle as string)
    }

    return NextResponse.redirect(`${baseUrl}${landingPath}`)
  } catch (err) {
    logError(err, { operation: 'checkout_success', sessionId })
    return NextResponse.redirect(`${baseUrl}/pricing?checkout=failed`)
  }
}
