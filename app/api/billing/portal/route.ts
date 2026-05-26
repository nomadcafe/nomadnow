import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getStripe, isStripeConfigured } from '@/lib/stripe/server'
import { formatErrorResponse, logError } from '@/lib/errors'

function getBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_BASE_URL
  if (explicit) return explicit
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

// Creates a one-time URL into Stripe's Customer Portal where the user can
// update card, swap plans, view invoices, and cancel.
//
// We delegate everything subscription-management to Stripe's portal rather
// than building our own UI — it stays in sync with Stripe's compliance, tax,
// and dunning rules without us tracking them.
export async function POST() {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Billing is not configured on this deployment' },
        { status: 503 },
      )
    }

    const { user } = await requireUser()
    const admin = createAdminSupabase()
    const { data: userRow } = await admin
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle()

    const customerId = userRow?.stripe_customer_id as string | null | undefined
    if (!customerId) {
      // No active billing relationship — send them through Checkout instead.
      return NextResponse.json(
        { error: 'No active subscription. Subscribe first.' },
        { status: 400 },
      )
    }

    const baseUrl = getBaseUrl()
    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/edit/account`,
    })
    return NextResponse.json({ url: session.url })
  } catch (error) {
    logError(error, { operation: 'billing_portal' })
    const r = formatErrorResponse(error)
    return NextResponse.json(
      { error: r.error, code: r.code },
      { status: r.statusCode },
    )
  }
}
