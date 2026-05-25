'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { createBrowserSupabase } from '@/lib/supabase/browser'

// "Get your card"-style CTA that adapts its label AND destination to the
// viewer's state, so a logged-in user with an active card never sees a
// button that asks them to "get" something they already have.
//
// State matrix:
//   guest                       → /pricing       · "Get your card"
//   logged in, no handle        → /create-card   · "Get your card"
//   logged in, handle, no plan  → /pricing       · "Finish setup"
//   logged in, handle + plan    → /{handle}      · "My card"
//
// Optional `showArrow` renders a right-arrow inside the button so the same
// component works for both terse nav use and the marketing-y hero / dark
// CTA buttons that wanted an arrow before.
type Resolved =
  | { href: string; labelKey: 'getCard' | 'finishSetup' | 'myCard' }

const DEFAULT_RESOLVED: Resolved = { href: '/pricing', labelKey: 'getCard' }

export function GetYourCardButton({
  className,
  showArrow = false,
}: {
  className?: string
  showArrow?: boolean
}) {
  const tNav = useTranslations('nav')
  // Default to the guest state so the button renders something useful before
  // the auth lookup resolves. For SSR/hydration this is also the safest
  // assumption — most homepage visitors are not signed in.
  const [resolved, setResolved] = useState<Resolved>(DEFAULT_RESOLVED)

  useEffect(() => {
    let mounted = true
    async function load() {
      const supabase = createBrowserSupabase()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!mounted) return

      if (!user) {
        setResolved({ href: '/pricing', labelKey: 'getCard' })
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('handle, plan')
        .eq('id', user.id)
        .maybeSingle()
      if (!mounted) return

      const handle = (profile?.handle as string | undefined) ?? null
      const plan = (profile?.plan as string | undefined) ?? null

      if (!handle) {
        setResolved({ href: '/create-card', labelKey: 'getCard' })
      } else if (!plan) {
        setResolved({ href: '/pricing', labelKey: 'finishSetup' })
      } else {
        setResolved({ href: `/${handle}`, labelKey: 'myCard' })
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <Link href={resolved.href} className={className}>
      {tNav(resolved.labelKey)}
      {showArrow && (
        <svg className="w-4 h-4 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      )}
    </Link>
  )
}
