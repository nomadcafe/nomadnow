import { createServerSupabase } from './supabase/server'
import type { AccountInitial } from '@/components/AccountMenu'

// Resolves the AccountMenu's initial state server-side so the nav can render
// the user's @handle on first paint instead of after two client round-trips.
// Used by every page that mounts <AccountMenu />. Cheap: one auth check plus
// one handle lookup; both run through the request-scoped Supabase client so
// the cookies-from-headers cost is amortised with other server fetches on
// the same page.
export async function getAccountInitial(): Promise<AccountInitial> {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { status: 'signedOut' }

  const { data } = await supabase
    .from('users')
    .select('handle')
    .eq('id', user.id)
    .maybeSingle()
  return { status: 'signedIn', handle: (data?.handle as string | null) ?? null }
}
