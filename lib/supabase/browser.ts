import { createBrowserClient } from '@supabase/ssr'
import { getEnvSafe } from '../env'

let browserClient: ReturnType<typeof createBrowserClient> | undefined

export function createBrowserSupabase() {
  if (browserClient) return browserClient
  const env = getEnvSafe()
  browserClient = createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  return browserClient
}
