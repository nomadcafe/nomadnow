import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { getBillingState } from '@/lib/billing'
import CreateCardForm from './CreateCardForm'

// Server gate. Middleware already redirects unauthenticated visitors to
// /login; this layer adds the paid-only check on top. Users without an
// active plan get bounced to /pricing so the only path to a card is through
// Checkout (or being grandfathered via migration 0003).
export default async function CreateCardPage() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login?next=/create-card')
  }
  const billing = await getBillingState(supabase, user.id)
  if (!billing.isActive) {
    redirect('/pricing')
  }
  return <CreateCardForm />
}
