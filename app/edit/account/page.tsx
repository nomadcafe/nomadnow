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

  // Handle is shown read-only (it has no rename path — INSERT-only since
  // migration 0027) so the user can see their permanent public identity.
  const { data: profile } = user
    ? await supabase.from('users').select('handle').eq('id', user.id).maybeSingle()
    : { data: null }

  return (
    <AccountSection
      email={user?.email ?? null}
      handle={(profile?.handle as string | null) ?? null}
    />
  )
}
