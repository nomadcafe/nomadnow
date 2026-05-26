'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/Toast'
import { LoadingSpinner } from '@/components/LoadingSpinner'

interface BillingDisplayState {
  plan: 'basic' | 'pro' | null
  status: string | null
  currentPeriodEnd: string | null
}

// Account tab content — profile link + billing only. No save flow (billing
// changes go through the Stripe portal), no preview, no dirty tracking. The
// look/appearance editor lives in LookSettingsForm; this component never
// touches /api/settings.
export function AccountSection() {
  const t = useTranslations('settings')
  const tCommon = useTranslations('common')
  const tBilling = useTranslations('settings.billing')
  const tBillingStatus = useTranslations('settings.billing.status')
  const locale = useLocale()
  const { toasts, showError, removeToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [billing, setBilling] = useState<BillingDisplayState>({
    plan: null,
    status: null,
    currentPeriodEnd: null,
  })
  const [portalLoading, setPortalLoading] = useState(false)

  // Billing read uses the admin client server-side because the columns are
  // locked down by RLS (migration 0007). A null payload is treated as "no
  // active subscription" so transient errors don't break the page.
  useEffect(() => {
    let alive = true
    fetch('/api/billing/state')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive || !data) return
        setBilling({
          plan: data.plan ?? null,
          status: data.status ?? null,
          currentPeriodEnd: data.currentPeriodEnd ?? null,
        })
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const openBillingPortal = async () => {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.url) {
        window.location.href = data.url
        return
      }
      showError(data.error || tBilling('portalError'))
    } catch {
      showError(tBilling('portalError'))
    } finally {
      setPortalLoading(false)
    }
  }

  const formatPeriodEnd = (iso: string | null): string | null => {
    if (!iso) return null
    try {
      return new Date(iso).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-12">
        <div className="space-y-10">
          <Section
            title={t('profile.title')}
            description={t('profile.description')}
          >
            <Link
              href="/edit/content"
              className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full border border-gray-300 hover:border-gray-900 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {t('profile.edit')}
            </Link>
          </Section>

          <Section
            title={tBilling('title')}
            description={tBilling('description')}
          >
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                    {tBilling('currentPlan')}
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {billing.plan === 'pro'
                      ? tBilling('planPro')
                      : billing.plan === 'basic'
                      ? tBilling('planBasic')
                      : tBilling('planNone')}
                    {billing.status && (
                      <span
                        className={`ml-2 inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full align-middle ${
                          billing.status === 'active' || billing.status === 'trialing'
                            ? 'bg-green-50 text-green-700 border border-green-100'
                            : billing.status === 'canceled'
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}
                      >
                        {(() => {
                          try {
                            return tBillingStatus(billing.status)
                          } catch {
                            return billing.status
                          }
                        })()}
                      </span>
                    )}
                  </div>
                  {billing.currentPeriodEnd && (
                    <div className="text-xs text-gray-500 mt-1">
                      {billing.status === 'canceled'
                        ? tBilling('endsOn', { date: formatPeriodEnd(billing.currentPeriodEnd) ?? '' })
                        : tBilling('renewsOn', { date: formatPeriodEnd(billing.currentPeriodEnd) ?? '' })}
                    </div>
                  )}
                </div>
                {billing.plan ? (
                  <button
                    type="button"
                    onClick={openBillingPortal}
                    disabled={portalLoading}
                    className="text-sm font-medium px-4 py-2 rounded-full border border-gray-300 hover:border-gray-900 transition disabled:opacity-60 disabled:cursor-wait"
                  >
                    {portalLoading ? tCommon('loading') : tBilling('manage')}
                  </button>
                ) : (
                  <Link
                    href="/pricing"
                    className="text-sm font-medium px-4 py-2 rounded-full bg-gray-900 text-white hover:bg-gray-800 transition"
                  >
                    {tBilling('subscribe')}
                  </Link>
                )}
              </div>
            </div>
          </Section>
        </div>
      </main>
    </>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      {children}
    </section>
  )
}
