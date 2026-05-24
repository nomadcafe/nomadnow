'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/Toast'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Logo } from '@/components/Logo'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { createBrowserSupabase } from '@/lib/supabase/browser'
import { THEMES, THEME_KEYS, type ThemeKey } from '@/lib/themes'
import {
  NOMAD_SECTIONS,
  NOMAD_DEFAULT_ORDER,
  reconcileSectionOrder,
  reconcileEnabledSections,
  type SectionDef,
} from '@/lib/sections'

interface ProfileSettings {
  layout_template?: 'centered' | 'card' | 'grid' | 'minimal'
  // theme_color stores the preset key (legacy column). See lib/themes.ts.
  theme_color?: ThemeKey
  enabled_sections?: string[]
  section_order?: string[]
  visibility?: 'public' | 'private'
  delay_days?: number
  hide_branding?: boolean
}

function normalizeTheme(value: unknown): ThemeKey {
  if (typeof value === 'string' && (THEME_KEYS as string[]).includes(value)) {
    return value as ThemeKey
  }
  // Legacy DB values ('blue', 'purple' etc) fall back to 'classic' on first save.
  return 'classic'
}

interface BillingDisplayState {
  plan: 'basic' | 'pro' | null
  status: string | null
  currentPeriodEnd: string | null
}

export default function SettingsPage() {
  const t = useTranslations('settings')
  const tCommon = useTranslations('common')
  const tBilling = useTranslations('settings.billing')
  const tBillingStatus = useTranslations('settings.billing.status')
  const locale = useLocale()
  const router = useRouter()
  const { toasts, showSuccess, showError, removeToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [handle, setHandle] = useState<string>('')
  const [billing, setBilling] = useState<BillingDisplayState>({
    plan: null,
    status: null,
    currentPeriodEnd: null,
  })
  const [portalLoading, setPortalLoading] = useState(false)
  const [settings, setSettings] = useState<ProfileSettings>({
    layout_template: 'centered',
    theme_color: 'classic',
    enabled_sections: NOMAD_DEFAULT_ORDER,
    section_order: NOMAD_DEFAULT_ORDER,
    visibility: 'public',
    delay_days: 0,
    hide_branding: false,
  })

  useEffect(() => {
    async function load() {
      const supabase = createBrowserSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login?next=/settings')
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('handle, plan, subscription_status, current_period_end')
        .eq('id', user.id)
        .maybeSingle()
      if (profile?.handle) setHandle(profile.handle as string)
      if (profile) {
        setBilling({
          plan: (profile.plan as 'basic' | 'pro' | null) ?? null,
          status: (profile.subscription_status as string | null) ?? null,
          currentPeriodEnd: (profile.current_period_end as string | null) ?? null,
        })
      }

      try {
        const response = await fetch('/api/settings')
        const data = await response.json()
        if (data.success && data.settings) {
          // Reconcile against the nomad section catalog so legacy creator IDs
          // get dropped and any new sections added since last save show up.
          const order = reconcileSectionOrder('nomad', data.settings.section_order)
          const enabled = Array.from(
            reconcileEnabledSections('nomad', data.settings.enabled_sections)
          )
          setSettings({
            layout_template: data.settings.layout_template || 'centered',
            theme_color: normalizeTheme(data.settings.theme_color),
            enabled_sections: enabled,
            section_order: order,
            visibility: data.settings.visibility || 'public',
            delay_days: data.settings.delay_days || 0,
            hide_branding: Boolean(data.settings.hide_branding),
          })
        }
      } catch (error) {
        console.error('Error loading settings:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save settings')
      }

      showSuccess(t('saved'))
      if (handle) {
        setTimeout(() => {
          router.push(`/${handle}`)
        }, 1200)
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      showError(error instanceof Error ? error.message : t('saveError'))
    } finally {
      setSaving(false)
    }
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

  // Renders the renewal/end-of-period line under the plan label. Active subs
  // see "renews on X"; canceled subs (still inside their paid period) see
  // "access ends on X" so they know exactly when the page goes dark.
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

  const toggleSection = (sectionId: string) => {
    // Required sections cannot be toggled off — required is enforced at render time
    // by reconcileEnabledSections, but block the click here for nicer UX.
    const def = NOMAD_SECTIONS.find((s) => s.id === sectionId)
    if (def?.required) return

    setSettings((prev) => {
      const enabled = prev.enabled_sections || []
      const newEnabled = enabled.includes(sectionId)
        ? enabled.filter((id) => id !== sectionId)
        : [...enabled, sectionId]
      // Note: keep section_order intact. Disabled sections retain their position
      // so re-enabling restores them where they were.
      return { ...prev, enabled_sections: newEnabled }
    })
  }

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    setSettings((prev) => {
      const order = prev.section_order || []
      const index = order.indexOf(sectionId)
      if (index === -1) return prev
      const newIndex = direction === 'up' ? index - 1 : index + 1
      if (newIndex < 0 || newIndex >= order.length) return prev
      const newOrder = [...order]
      ;[newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]]
      return { ...prev, section_order: newOrder }
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="min-h-screen bg-white text-gray-900">
        <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
            <Logo />
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              {handle ? (
                <Link href={`/${handle}`} className="text-sm text-gray-500 hover:text-gray-900 transition">
                  {t('navView')}
                </Link>
              ) : (
                <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 transition">
                  {tCommon('cancel')}
                </Link>
              )}
            </div>
          </div>
        </nav>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14 pb-32">
          <header className="mb-10">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-2">
              {t('title')}
            </h1>
            <p className="text-gray-600">
              {t('subtitle')}
            </p>
          </header>

          <div className="space-y-10">
            {/* Billing */}
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

            {/* Layout */}
            <Section
              title={t('layout.title')}
              description={t('layout.description')}
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['centered', 'card', 'grid', 'minimal'] as const).map((template) => {
                  const active = settings.layout_template === template
                  return (
                    <button
                      key={template}
                      onClick={() => setSettings((prev) => ({ ...prev, layout_template: template }))}
                      className={`p-4 rounded-xl border transition text-left ${
                        active
                          ? 'border-gray-900 bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-sm font-medium text-gray-900">{t(`layout.${template}`)}</div>
                    </button>
                  )
                })}
              </div>
            </Section>

            {/* Theme */}
            <Section
              title={t('theme.title')}
              description={t('theme.description')}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {THEME_KEYS.map((key) => (
                  <ThemeTile
                    key={key}
                    themeKey={key}
                    active={settings.theme_color === key}
                    onClick={() => setSettings((prev) => ({ ...prev, theme_color: key }))}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                {t('theme.previewHint')}
                <a
                  href={`/preview?theme=${settings.theme_color || 'classic'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-700 underline underline-offset-2 hover:text-gray-900"
                >
                  /preview
                </a>
                .
              </p>
            </Section>

            {/* Sections */}
            <Section
              title={t('sections.title')}
              description={t('sections.description')}
            >
              <div className="space-y-2">
                {(() => {
                  const defs = NOMAD_SECTIONS
                  const order = settings.section_order ?? NOMAD_DEFAULT_ORDER
                  // Render in the user's preferred order so move-up/down feedback is instant.
                  return order
                    .map((id) => defs.find((d) => d.id === id))
                    .filter((d): d is SectionDef => Boolean(d))
                    .map((section, idx, arr) => {
                      const isEnabled = settings.enabled_sections?.includes(section.id) ?? true
                      const isFirst = idx === 0
                      const isLast = idx === arr.length - 1
                      const isRequired = section.required

                      return (
                        <div
                          key={section.id}
                          className={`flex items-center gap-3 p-4 rounded-xl border transition ${
                            isEnabled
                              ? 'border-gray-200 bg-white'
                              : 'border-gray-100 bg-gray-50 opacity-60'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            disabled={isRequired}
                            onChange={() => toggleSection(section.id)}
                            className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900/30 disabled:cursor-not-allowed"
                            aria-label={`${t('sections.show')} ${section.label}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                              {section.label}
                              {isRequired && (
                                <span className="text-[10px] uppercase tracking-wider text-gray-400 font-normal">
                                  {tCommon('required')}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 truncate">{section.description}</div>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => moveSection(section.id, 'up')}
                              disabled={isFirst}
                              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                              aria-label={t('sections.moveUp')}
                            >
                              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => moveSection(section.id, 'down')}
                              disabled={isLast}
                              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                              aria-label={t('sections.moveDown')}
                            >
                              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )
                    })
                })()}
              </div>
            </Section>

            {/* Branding */}
            <Section
              title={t('branding.title')}
              description={t('branding.description')}
            >
              <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 cursor-pointer hover:border-gray-300 transition">
                <input
                  type="checkbox"
                  checked={Boolean(settings.hide_branding)}
                  onChange={(e) => setSettings((prev) => ({ ...prev, hide_branding: e.target.checked }))}
                  className="w-4 h-4 mt-0.5 text-gray-900 border-gray-300 rounded focus:ring-gray-900/30"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {t('branding.hideLabel')}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {t('branding.hideHint')}
                  </div>
                </div>
              </label>
            </Section>

            {/* Privacy */}
            <Section
              title={t('privacy.title')}
              description={t('privacy.description')}
            >
              <div className="space-y-4">
                <Field label={t('privacy.visibilityLabel')}>
                  <select
                    value={settings.visibility || 'public'}
                    onChange={(e) => setSettings((prev) => ({ ...prev, visibility: e.target.value as 'public' | 'private' }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 transition bg-white text-base"
                  >
                    <option value="public">{t('privacy.visibilityPublic')}</option>
                    <option value="private">{t('privacy.visibilityPrivate')}</option>
                  </select>
                </Field>

                <Field
                  label={t('privacy.delayLabel')}
                  hint={t('privacy.delayHint')}
                >
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={settings.delay_days || 0}
                    onChange={(e) => setSettings((prev) => ({ ...prev, delay_days: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 transition text-base"
                    placeholder="0"
                  />
                </Field>
              </div>
            </Section>
          </div>
        </main>

        {/* Sticky save bar */}
        <div className="fixed bottom-0 inset-x-0 z-40 border-t border-gray-100 bg-white/95 backdrop-blur">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
            {handle && (
              <Link
                href={`/${handle}`}
                className="px-5 py-3 text-gray-600 hover:text-gray-900 rounded-full font-medium transition text-sm"
              >
                {tCommon('cancel')}
              </Link>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 sm:flex-none sm:ml-auto bg-gray-900 text-white px-6 py-3 rounded-full font-medium hover:bg-gray-800 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[140px]"
            >
              {saving ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>{tCommon('saving')}</span>
                </>
              ) : (
                <span>{tCommon('save')}</span>
              )}
            </button>
          </div>
        </div>
      </div>
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

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-900 mb-1.5">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

function ThemeTile({
  themeKey,
  active,
  onClick,
}: {
  themeKey: ThemeKey
  active: boolean
  onClick: () => void
}) {
  const theme = THEMES[themeKey]
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-label={`Theme: ${theme.label}`}
      className={`group text-left rounded-2xl overflow-hidden border-2 transition focus:outline-none focus:ring-2 focus:ring-gray-900/20 ${
        active ? 'border-gray-900 ring-2 ring-gray-900/10 ring-offset-2' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Mini preview surface: applies the theme's page background + a smaller card. */}
      <div className={`${theme.page} ${theme.font} p-3 h-28 flex items-center justify-center`}>
        <div className={`${theme.card} ${theme.text} w-full p-2.5 flex flex-col items-center gap-1.5`}>
          <div
            className="w-6 h-6 rounded-full"
            style={{ background: `linear-gradient(135deg, ${theme.accentHex}, ${theme.accentHex}aa)` }}
          />
          <div className="h-1.5 w-12 rounded-full" style={{ background: 'currentColor', opacity: 0.55 }} />
          <div className="h-1 w-16 rounded-full" style={{ background: 'currentColor', opacity: 0.25 }} />
          <div className="flex gap-1 mt-1">
            <span
              className="h-1.5 w-3 rounded-full"
              style={{ background: theme.accentHex, opacity: 0.7 }}
            />
            <span className="h-1.5 w-3 rounded-full" style={{ background: 'currentColor', opacity: 0.3 }} />
          </div>
        </div>
      </div>
      {/* Label bar */}
      <div className="bg-white px-3 py-2 flex items-center justify-between text-xs">
        <span className={`font-medium ${active ? 'text-gray-900' : 'text-gray-700'}`}>
          {theme.label}
        </span>
        {active && (
          <svg className="w-3.5 h-3.5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    </button>
  )
}
