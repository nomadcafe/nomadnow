import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getStripe, isStripeConfigured, planForPriceId, type Plan } from '@/lib/stripe/server'
import { logError } from '@/lib/errors'

// Stripe webhooks need the raw body bytes to verify the HMAC signature.
// Next.js defaults to JSON-parsing — opt out via runtime config.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Resolves a subscription's plan and period from its line items. Picks the
// first recognised price ID — multi-line subs aren't a shape we sell.
//
// Recent Stripe API versions moved `current_period_end` from the subscription
// onto each subscription item. We take the max across items so we always
// represent "when this user's access is paid through".
function extractPlanFields(sub: Stripe.Subscription): {
  plan: Plan | null
  currentPeriodEndSeconds: number | null
} {
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
  return {
    plan,
    currentPeriodEndSeconds: maxPeriodEnd > 0 ? maxPeriodEnd : null,
  }
}

// Pushes subscription state to the user row. Looked up by stripe_customer_id
// since that's what Stripe attaches to every event. The webhook is the only
// source of truth for `plan` / `subscription_status` / `current_period_end` —
// app code reads these but never writes them directly.
async function syncSubscription(sub: Stripe.Subscription) {
  const admin = createAdminSupabase()
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id

  const { plan, currentPeriodEndSeconds } = extractPlanFields(sub)
  const currentPeriodEndIso = currentPeriodEndSeconds
    ? new Date(currentPeriodEndSeconds * 1000).toISOString()
    : null

  // canceled+period-passed gets cleared from `plan` so app gating can use the
  // single flag. We keep subscription_status='canceled' so /[handle] can show
  // the "expired" page distinctly from "never subscribed".
  const periodInFuture = currentPeriodEndSeconds
    ? currentPeriodEndSeconds * 1000 > Date.now()
    : false
  const keepPlan = sub.status !== 'canceled' || periodInFuture

  const updates: Record<string, unknown> = {
    subscription_id: sub.id,
    subscription_status: sub.status,
    current_period_end: currentPeriodEndIso,
    plan: keepPlan ? plan : null,
    updated_at: new Date().toISOString(),
  }

  const { error } = await admin
    .from('users')
    .update(updates)
    .eq('stripe_customer_id', customerId)

  if (error) {
    logError(error, { operation: 'webhook_sync_subscription', customerId, subId: sub.id })
    throw error
  }
}

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Billing is not configured' }, { status: 503 })
  }

  const sig = request.headers.get('stripe-signature')
  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  const rawBody = await request.text()
  const stripe = getStripe()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    )
  } catch (err) {
    logError(err, { operation: 'webhook_signature_verify' })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        // Subscriptions trigger a separate `customer.subscription.created`
        // event that does the heavy lifting; we just make sure we've
        // associated the customer ID with the user row in case it wasn't
        // present before Checkout.
        //
        // Defence in depth: client_reference_id and metadata.user_id are
        // both set by /api/billing/checkout when we create the session.
        // If both are present and DON'T match, refuse to bind — that's a
        // shape we never produce, so seeing it means either Stripe data
        // corruption or a forged event (which signature verification has
        // already blocked, but the secret could be leaked in future).
        const refId = session.client_reference_id ?? null
        const metaId = session.metadata?.user_id ?? null
        const userId = refId ?? metaId
        if (refId && metaId && refId !== metaId) {
          logError(
            new Error('checkout session client_reference_id / metadata.user_id mismatch'),
            { operation: 'webhook_bind_customer', refId, metaId, sessionId: session.id },
          )
          break
        }
        const customerId =
          typeof session.customer === 'string' ? session.customer : session.customer?.id
        if (userId && customerId) {
          // `.is('stripe_customer_id', null)` is the real protection — it
          // means we never rebind a customer onto a user that already has
          // one. Combined with the UNIQUE constraint on stripe_customer_id,
          // a forged event can at most bind a fresh customer to a user
          // who never paid (annoying, not a takeover).
          const admin = createAdminSupabase()
          await admin
            .from('users')
            .update({ stripe_customer_id: customerId })
            .eq('id', userId)
            .is('stripe_customer_id', null)
        }
        // Pull the full subscription so we can write plan/status immediately.
        // Without this, the user could see /pricing for a beat after paying
        // while customer.subscription.created races.
        if (session.subscription) {
          const subId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription.id
          const sub = await stripe.subscriptions.retrieve(subId)
          await syncSubscription(sub)
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await syncSubscription(event.data.object as Stripe.Subscription)
        break
      }

      case 'invoice.payment_failed': {
        // Stripe sets subscription.status='past_due' on the parent sub and
        // fires customer.subscription.updated — no extra DB write needed here.
        // Kept the case so the log explicitly captures the dunning step.
        break
      }

      default:
        // Unhandled event types are not errors — Stripe sends a wide variety
        // and we only care about subscription lifecycle. Returning 200 keeps
        // the dashboard's webhook health green.
        break
    }
  } catch (err) {
    logError(err, { operation: 'webhook_handler', eventType: event.type })
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
