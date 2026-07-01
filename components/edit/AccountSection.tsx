'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/Toast'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { createBrowserSupabase } from '@/lib/supabase/browser'

interface BillingDisplayState {
  plan: 'basic' | 'pro' | null
  status: string | null
  currentPeriodEnd: string | null
}

// Account tab content — sign-in details + billing. No save flow (billing
// changes go through the Stripe portal), no preview, no dirty tracking. The
// look/appearance editor lives in LookSettingsForm; this component never
// touches /api/settings.
//
// Email is passed from the server-side wrapper page so the address renders
// on first paint without a client-side auth round-trip.
export function AccountSection({
  email,
  handle,
}: {
  email: string | null
  handle: string | null
}) {
  const t = useTranslations('settings')
  const tNav = useTranslations('nav')
  const tCommon = useTranslations('common')
  const tBilling = useTranslations('settings.billing')
  const tBillingStatus = useTranslations('settings.billing.status')
  const tAccount = useTranslations('edit.account')
  const locale = useLocale()
  const router = useRouter()
  const { toasts, showError, showSuccess, removeToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [billing, setBilling] = useState<BillingDisplayState>({
    plan: null,
    status: null,
    currentPeriodEnd: null,
  })
  const [portalLoading, setPortalLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

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

  const signOut = async () => {
    const supabase = createBrowserSupabase()
    await supabase.auth.signOut()
    // Send the user back to /login so the post-signout state is unambiguous —
    // refresh() alone would just leave them staring at /edit/account with no
    // clear "you're signed out now" signal.
    router.push('/login')
    router.refresh()
  }

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

  const exportData = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/account/export')
      if (!res.ok) throw new Error('export failed')
      const blob = await res.blob()
      // Trigger a client-side download without navigating away from the tab.
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nomadnow-${handle ?? 'account'}-export.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      showError(tAccount('exportError'))
    } finally {
      setExporting(false)
    }
  }

  const deleteAccount = async () => {
    setDeleting(true)
    try {
      const res = await fetch('/api/account', { method: 'DELETE' })
      if (!res.ok) throw new Error('delete failed')
      // Row + auth identity are gone; clear the local session and land on the
      // home page so there's an unambiguous "you're signed out" state.
      const supabase = createBrowserSupabase()
      await supabase.auth.signOut()
      router.push('/')
      router.refresh()
    } catch {
      showError(tAccount('deleteError'))
      setDeleting(false)
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
          {/* Account — sign-in metadata + sign-out. Replaces the previous
              "Edit profile" link section which was just a duplicate of the
              Content tab nav directly above. */}
          <Section
            title={t('account.title')}
            description={t('account.description')}
          >
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 space-y-4">
                  {handle && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                        {tAccount('handleLabel')}
                      </div>
                      <div className="text-sm font-medium text-gray-900 font-mono break-all">
                        nomad.now/{handle}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{tAccount('handleLocked')}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                      {t('account.emailLabel')}
                    </div>
                    <div className="text-sm font-medium text-gray-900 font-mono break-all">
                      {email ?? '—'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={signOut}
                  className="text-sm font-medium px-4 py-2 rounded-full border border-gray-300 hover:border-gray-900 transition"
                >
                  {tNav('signout')}
                </button>
              </div>
            </div>
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

          {/* Your data — self-serve export. */}
          <Section title={tAccount('dataTitle')} description={tAccount('dataDescription')}>
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900">{tAccount('exportTitle')}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{tAccount('exportHint')}</div>
                </div>
                <button
                  type="button"
                  onClick={exportData}
                  disabled={exporting}
                  className="text-sm font-medium px-4 py-2 rounded-full border border-gray-300 hover:border-gray-900 transition disabled:opacity-60 disabled:cursor-wait"
                >
                  {exporting ? tCommon('loading') : tAccount('exportButton')}
                </button>
              </div>
            </div>
          </Section>

          {/* Danger zone — permanent account deletion, gated behind a
              type-your-handle confirmation so it can't be a one-click mistake. */}
          <Section title={tAccount('dangerTitle')} description={tAccount('dangerDescription')}>
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-5">
              {!confirmOpen ? (
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900">{tAccount('deleteTitle')}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{tAccount('deleteHint')}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmOpen(true)}
                    className="text-sm font-medium px-4 py-2 rounded-full border border-red-300 text-red-600 hover:border-red-600 hover:bg-red-50 transition"
                  >
                    {tAccount('deleteButton')}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm text-gray-900">
                    {handle
                      ? tAccount.rich('deleteConfirmPrompt', {
                          handle,
                          strong: (chunks) => <span className="font-mono font-semibold">{chunks}</span>,
                        })
                      : tAccount('deleteConfirmPromptNoHandle')}
                  </div>
                  {handle && (
                    <input
                      type="text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder={handle}
                      autoComplete="off"
                      spellCheck={false}
                      className="w-full sm:w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={deleteAccount}
                      disabled={deleting || (!!handle && confirmText.trim().toLowerCase() !== handle.toLowerCase())}
                      className="text-sm font-medium px-4 py-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleting ? tCommon('loading') : tAccount('deleteConfirmButton')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmOpen(false)
                        setConfirmText('')
                      }}
                      disabled={deleting}
                      className="text-sm font-medium px-4 py-2 rounded-full border border-gray-300 hover:border-gray-900 transition disabled:opacity-60"
                    >
                      {tCommon('cancel')}
                    </button>
                  </div>
                </div>
              )}
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
