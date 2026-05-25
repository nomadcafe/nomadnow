'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserSupabase } from '@/lib/supabase/browser'

// "Get your card" CTA that routes based on auth state instead of always
// going to /pricing. The previous behavior surfaced /pricing to logged-in
// subscribed users — confusing, since they already have a card.
//
// Routing matrix:
//   logged out                   → /pricing  (sell the value first)
//   logged in, no handle         → /create-card
//   logged in, handle, no plan   → /pricing  (claim was free, now subscribe)
//   logged in, handle + plan     → /{handle} (their public card)
//
// Renders as a plain anchor with the same className the static Link used,
// so the visual style across the page stays identical.
export function GetYourCardButton({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  const [href, setHref] = useState<string>('/pricing')

  useEffect(() => {
    let mounted = true
    async function load() {
      const supabase = createBrowserSupabase()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!mounted) return
      if (!user) {
        setHref('/pricing')
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
      if (handle && plan) {
        setHref(`/${handle}`)
      } else if (!handle) {
        setHref('/create-card')
      } else {
        setHref('/pricing')
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  )
}
