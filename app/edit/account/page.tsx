import { AccountSection } from '@/components/edit/AccountSection'
import { createServerSupabase } from '@/lib/supabase/server'

// /edit/account — sign-in details + billing. No save flow (billing has
// its own Stripe portal handler), no preview, no dirty tracking. Reads
// the user's email server-side and passes it down so the Account section
// renders the address on first paint (no client-side flash). The layout
// already auth-gates this route, so user is guaranteed non-null here.
export default async function EditAccountPage() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return <AccountSection email={user?.email ?? null} />
}
