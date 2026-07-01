'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

type Plan = 'basic' | 'pro'
type BillingInterval = 'monthly' | 'yearly'

interface PlanCheckoutButtonProps {
  plan: Plan
  // Billing cadence this button checks out with. Defaults to monthly so
  // existing call sites (e.g. the final CTA) don't have to pass it.
  interval?: BillingInterval
  // Server-passed: what plan the viewer is currently subscribed to (or null).
  // Drives whether this button starts a Checkout, opens the Customer Portal,
  // or just shows a "Current plan" badge.
  currentPlan?: Plan | null
  className?: string
  children: React.ReactNode
}

// Three button states, chosen by comparing `plan` (which plan card this button
// belongs to) against `currentPlan` (the user's active subscription):
//   - no subscription: POST /api/billing/checkout, redirect to Stripe
//   - subscribed to this plan: render an inert "Current plan" badge so the
//     user can't double-pay by clicking twice
//   - subscribed to the other plan: send them to the Customer Portal where
//     plan switches happen — Stripe handles proration and avoids creating a
//     second subscription on the same customer
export function PlanCheckoutButton({
  plan,
  interval = 'monthly',
  currentPlan,
  className,
  children,
}: PlanCheckoutButtonProps) {
  const t = useTranslations('common')
  const tPricing = useTranslations('pricing')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isCurrent = currentPlan === plan
  const isOnOtherPlan = currentPlan !== null && currentPlan !== undefined && currentPlan !== plan

  const startCheckout = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, interval }),
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

  const openPortal = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.url) {
        window.location.href = data.url
        return
      }
      setError(data.error || 'Could not open subscription portal.')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (isCurrent) {
    // Inert label — can't be clicked to "buy again". Keeps the card layout
    // stable (same height) by sharing the button class.
    return (
      <div
        className={`${className ?? ''} cursor-default opacity-80 inline-flex items-center justify-center gap-1.5`}
        aria-disabled="true"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span>{tPricing('currentPlanLabel')}</span>
      </div>
    )
  }

  const handler = isOnOtherPlan ? openPortal : startCheckout
  const label = isOnOtherPlan ? tPricing('manageSubscription') : children

  return (
    <>
      <button
        type="button"
        onClick={handler}
        disabled={loading}
        className={`${className ?? ''} disabled:opacity-60 disabled:cursor-wait`}
      >
        {loading ? t('loading') : label}
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-500 text-center" role="alert">
          {error}
        </p>
      )}
    </>
  )
}
