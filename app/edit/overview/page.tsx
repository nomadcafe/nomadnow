import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { getBillingState } from '@/lib/billing'
import { OverviewDashboard } from '@/components/edit/OverviewDashboard'

// /edit/overview — the dashboard landing for the edit shell. Confirms the card
// exists (first-time users are sent to /create-card, same guard as the Content
// tab), then hands the public identity + last-updated timestamp to the client
// dashboard, which owns the share tools + analytics fetch. The layout already
// auth-gates this route, so user is guaranteed non-null.
export default async function EditOverviewPage() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/edit/overview')

  const { data: profile } = await supabase
    .from('users')
    .select('handle, display_name, updated_at')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) redirect('/create-card')

  // Paid-only model: editing an existing card requires an active plan. Checked
  // after the "card exists" gate so a user with no card is funneled to
  // /create-card (open, pre-paywall) rather than straight to pricing.
  // /edit/account is intentionally NOT gated so a lapsed user can still reach
  // billing / delete their account.
  const billing = await getBillingState(user.id)
  if (!billing.isActive) redirect('/pricing?from=edit')

  return (
    <OverviewDashboard
      handle={profile.handle as string}
      displayName={(profile.display_name as string | null) ?? null}
      updatedAt={(profile.updated_at as string | null) ?? null}
    />
  )
}
