import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getStripe, isStripeConfigured, priceIdForPlan } from '@/lib/stripe/server'
import { ValidationError, formatErrorResponse, logError } from '@/lib/errors'

const bodySchema = z.object({
  plan: z.enum(['basic', 'pro']),
})

// Returns the absolute URL of the running deployment. Stripe Checkout needs
// fully-qualified success/cancel URLs.
function getBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_BASE_URL
  if (explicit) return explicit
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

export async function POST(request: Request) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Billing is not configured on this deployment' },
        { status: 503 },
      )
    }

    const { user } = await requireUser()
    const body = await request.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError('Invalid checkout payload', parsed.error.errors)
    }

    // Look up an existing Stripe customer ID on the user. Admin client because
    // the row may not be RLS-readable for write paths and we need to mutate
    // stripe_customer_id once Stripe assigns it.
    const admin = createAdminSupabase()
    const { data: userRow } = await admin
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle()

    const stripe = getStripe()
    let customerId = userRow?.stripe_customer_id as string | null | undefined

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { user_id: user.id },
      })
      customerId = customer.id
      await admin
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    const baseUrl = getBaseUrl()
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      // Tag the session so the webhook can correlate it back to our user even
      // if metadata on the subscription is missing for any reason.
      client_reference_id: user.id,
      metadata: { user_id: user.id, plan: parsed.data.plan },
      subscription_data: {
        metadata: { user_id: user.id, plan: parsed.data.plan },
      },
      line_items: [
        {
          price: priceIdForPlan(parsed.data.plan),
          quantity: 1,
        },
      ],
      // Go through our own /api/billing/checkout/success first instead of
      // landing on /create-card directly. That route forces a DB sync from
      // the Checkout Session before the redirect, eliminating the race with
      // the webhook (which usually fires within seconds but isn't guaranteed
      // to beat the user's browser back from Stripe). Stripe substitutes
      // {CHECKOUT_SESSION_ID} server-side, no encoding needed.
      success_url: `${baseUrl}/api/billing/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing?checkout=canceled`,
      allow_promotion_codes: true,
    })

    if (!session.url) {
      throw new Error('Stripe did not return a Checkout URL')
    }
    return NextResponse.json({ url: session.url })
  } catch (error) {
    logError(error, { operation: 'billing_checkout' })
    const r = formatErrorResponse(error)
    return NextResponse.json(
      { error: r.error, code: r.code, details: r.details },
      { status: r.statusCode },
    )
  }
}
