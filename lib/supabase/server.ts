import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getEnvSafe } from '../env'
import { UnauthorizedError } from '../errors'

export async function createServerSupabase() {
  const env = getEnvSafe()
  const cookieStore = await cookies()

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Called from a Server Component — middleware will refresh the session
          }
        },
      },
    }
  )
}

export async function getSessionUser() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * For use inside Route Handlers: returns { supabase, user } or throws UnauthorizedError.
 * The returned client is session-scoped — RLS will enforce ownership on writes.
 */
export async function requireUser() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new UnauthorizedError('Sign in required')
  return { supabase, user }
}
