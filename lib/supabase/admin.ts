import { createClient } from '@supabase/supabase-js'
import { getEnvSafe } from '../env'

/**
 * Service-role client. Bypasses RLS — use ONLY for trusted server-side admin operations
 * (e.g. moderation, internal backfills). Never accept user-supplied IDs as authorization.
 */
export function createAdminSupabase() {
  const env = getEnvSafe()
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
