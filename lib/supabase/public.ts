import { createClient } from '@supabase/supabase-js'
import { getEnvSafe } from '../env'

// Cookie-free anon client for PUBLIC reads (profiles, the explore directory).
// `unstable_cache` forbids reading cookies/headers in its callback, and public
// data is identical for every viewer (only public-read columns, gated by RLS),
// so a session-less client is both correct and what lets results be cached
// across requests and users. Server-only.
export function createPublicSupabase() {
  const env = getEnvSafe()
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
