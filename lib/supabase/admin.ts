import { createClient } from '@supabase/supabase-js'
import { getEnvSafe } from '../env'

/**
 * Service-role client. Bypasses RLS — use ONLY for trusted server-side admin operations
 * (e.g. moderation, internal backfills, Stripe webhook syncs). Never accept user-supplied
 * IDs as authorization.
 *
 * Throws a clear error when SUPABASE_SERVICE_ROLE_KEY isn't configured rather than
 * silently constructing a broken client. The env schema marks the key optional so
 * anon-only routes keep working when it's missing — only admin call sites fail.
 */
export function createAdminSupabase() {
  const env = getEnvSafe()
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not configured. Set it in your environment to enable admin operations.',
    )
  }
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
