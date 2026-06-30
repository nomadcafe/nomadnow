'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createBrowserSupabase } from '@/lib/supabase/browser'

// Replacement for the hardcoded "Sign in" link in page navs. Shows the user's
// handle (or "Account" if they haven't claimed one yet) with a dropdown when
// signed in — Settings, View profile, Sign out — and falls back to the plain
// "Sign in" link when they're not.
//
// Uses a <details>/<summary> for the dropdown so the open/close mechanic is
// native and accessible without pulling in a popover library.
type State =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; handle: string | null }

// Resolved auth state a server component can pass down so the menu renders
// the final label on first paint instead of a loading placeholder that pops
// in after two sequential network calls. Shape matches the runtime State,
// minus the 'loading' variant (server already knows the answer).
export type AccountInitial =
  | { status: 'signedOut' }
  | { status: 'signedIn'; handle: string | null }

export function AccountMenu({
  className = '',
  initial,
}: {
  className?: string
  initial?: AccountInitial
}) {
  const tNav = useTranslations('nav')
  const router = useRouter()
  // `initial` (server-resolved) is the source of truth for first paint.
  // clientState overrides it only when the client knows better: a no-initial
  // page that fetched its own state, an explicit sign-out, or — see below —
  // nothing, because the stale-signed-out case self-heals via router.refresh()
  // rather than a local override.
  const [clientState, setClientState] = useState<State | null>(null)
  const refreshedRef = useRef(false)
  const state: State = clientState ?? initial ?? { status: 'loading' }

  useEffect(() => {
    if (initial) {
      // Server already resolved the auth state — trust it for first paint (no
      // flash, no client round-trip). But self-heal the ONE case it can be
      // wrong: a stale "signed out" render served right after login, when the
      // just-set session cookie hadn't propagated to that render (or it came
      // from a cached/raced render). The public card reads fine elsewhere, so
      // the nav looking logged-out is the visible symptom. If the server said
      // signed-out yet the browser actually holds a Supabase session, re-run
      // the server components once so the nav (and the rest of the page) pick
      // up the real session. getSession() reads local cookie storage only — no
      // network — and refreshedRef makes it fire at most once (a genuinely
      // invalid session re-renders to signed-out and simply stops, no loop).
      if (initial.status === 'signedOut' && !refreshedRef.current) {
        void (async () => {
          const supabase = createBrowserSupabase()
          const {
            data: { session },
          } = await supabase.auth.getSession()
          if (session && !refreshedRef.current) {
            refreshedRef.current = true
            router.refresh()
          }
        })()
      }
      return
    }

    // No server-resolved state (pages that don't pass `initial`): fetch it.
    let mounted = true
    async function load() {
      const supabase = createBrowserSupabase()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!mounted) return
      if (!user) {
        setClientState({ status: 'signedOut' })
        return
      }
      const { data: profile } = await supabase
        .from('users')
        .select('handle')
        .eq('id', user.id)
        .maybeSingle()
      if (!mounted) return
      setClientState({ status: 'signedIn', handle: (profile?.handle as string | null) ?? null })
    }
    load()
    return () => {
      mounted = false
    }
  }, [initial, router])

  if (state.status === 'loading') {
    // Reserve roughly the same width as the signed-in label to avoid the
    // nav from shifting once the auth state resolves.
    return <div className={`w-20 h-8 ${className}`} aria-hidden />
  }

  if (state.status === 'signedOut') {
    return (
      <Link
        href="/login"
        className={`text-sm text-gray-600 hover:text-gray-900 px-3 py-2 transition ${className}`}
      >
        {tNav('signin')}
      </Link>
    )
  }

  const handleLabel = state.handle ? `@${state.handle}` : tNav('account')

  async function signOut() {
    const supabase = createBrowserSupabase()
    await supabase.auth.signOut()
    setClientState({ status: 'signedOut' })
    router.refresh()
  }

  return (
    <details className={`relative ${className}`}>
      <summary className="cursor-pointer list-none text-sm text-gray-700 hover:text-gray-900 px-3 py-2 transition inline-flex items-center gap-1">
        {handleLabel}
        <svg
          className="w-3 h-3 group-open:rotate-180 transition"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="absolute right-0 top-full mt-1 min-w-[160px] bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
        {state.handle && (
          <Link
            href={`/${state.handle}`}
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            {tNav('viewProfile')}
          </Link>
        )}
        <Link
          href="/edit/account"
          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          {tNav('settings')}
        </Link>
        <button
          type="button"
          onClick={signOut}
          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 border-t border-gray-100"
        >
          {tNav('signout')}
        </button>
      </div>
    </details>
  )
}
