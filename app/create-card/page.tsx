import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import CreateCardForm from './CreateCardForm'

// Auth + existing-card gate. Middleware bounces unauth visitors to /login;
// we additionally redirect users who already claimed a handle straight to
// their public card so they don't see an empty "Claim your card" form
// after coming back from Checkout.
//
// No plan gate here on purpose — see commit history for why. Order is now
// claim-handle → subscribe; the CreateCardForm's post-submit redirect routes
// unpaid users to /pricing.
export default async function CreateCardPage() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login?next=/create-card')
  }

  // If this user already has a row in public.users, they've already claimed
  // their handle. Showing the empty form again would be a UNIQUE-conflict
  // trap (id is primary key). Send them to their existing card instead.
  const { data: existing } = await supabase
    .from('users')
    .select('handle')
    .eq('id', user.id)
    .maybeSingle()
  if (existing?.handle) {
    redirect(`/${existing.handle}`)
  }

  return <CreateCardForm />
}
