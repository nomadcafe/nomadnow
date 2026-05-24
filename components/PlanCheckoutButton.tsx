'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

interface PlanCheckoutButtonProps {
  plan: 'basic' | 'pro'
  className?: string
  children: React.ReactNode
}

// Trades the plain Link for a button that calls /api/billing/checkout.
//
// If the user isn't signed in, the route returns 401 and we redirect to
// /login with `next` set back to /pricing — they continue the flow after
// magic-link, click the same plan again, and roll into Stripe Checkout.
// Skipping the auto-resume-after-login dance keeps state out of the URL.
export function PlanCheckoutButton({ plan, className, children }: PlanCheckoutButtonProps) {
  const t = useTranslations('common')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onClick = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      if (res.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent('/pricing')}`
        return
      }
      const data = await res.json()
      if (res.ok && data.url) {
        window.location.href = data.url
        return
      }
      setError(data.error || 'Could not start checkout. Please try again.')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className={`${className ?? ''} disabled:opacity-60 disabled:cursor-wait`}
      >
        {loading ? t('loading') : children}
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-500 text-center" role="alert">
          {error}
        </p>
      )}
    </>
  )
}
