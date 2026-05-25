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
import { THEMES, THEME_KEYS, BUTTON_SHAPE_KEYS, type ThemeKey, type ButtonShape } from '@/lib/themes'
import {
  BACKGROUND_MODE_KEYS,
  GRADIENT_PRESETS,
  resolveBackgroundCss,
  type BackgroundMode,
} from '@/lib/card-background'
import { FONT_OPTIONS, FONT_KEYS, type FontKey } from '@/lib/fonts'
import {
  NOMAD_SECTIONS,
  NOMAD_DEFAULT_ORDER,
  reconcileSectionOrder,
  type SectionDef,
} from '@/lib/sections'

interface ProfileSettings {
  // theme_color stores the preset key (legacy column). See lib/themes.ts.
  theme_color?: ThemeKey
  button_shape?: ButtonShape
  background_mode?: BackgroundMode
  background_value?:
    | { color: string }
    | { from: string; to: string; angle: number }
    | null
  font_family?: FontKey
  section_order?: string[]
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
  const tNav = useTranslations('nav')
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
    theme_color: 'classic',
    button_shape: 'rounded',
    background_mode: 'theme',
    background_value: null,
    font_family: 'theme',
    section_order: NOMAD_DEFAULT_ORDER,
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

      // Handle is in the publicly-readable column set. Billing fields are
      // not — they go through /api/billing/state which uses the admin
      // client server-side. See migration 0007 for the column lockdown.
      const { data: profile } = await supabase
        .from('users')
        .select('handle')
        .eq('id', user.id)
        .maybeSingle()
      if (profile?.handle) setHandle(profile.handle as string)

      try {
        const billingRes = await fetch('/api/billing/state')
        if (billingRes.ok) {
          const billingData = await billingRes.json()
          setBilling({
            plan: billingData.plan ?? null,
            status: billingData.status ?? null,
            currentPeriodEnd: billingData.currentPeriodEnd ?? null,
          })
        }
      } catch {
        // Non-fatal — settings page still renders with billing=null,
        // which the UI treats as "no active subscription".
      }

      try {
        const response = await fetch('/api/settings')
        const data = await response.json()
        if (data.success && data.settings) {
          // Reconcile against the nomad section catalog so legacy creator IDs
          // get dropped and any new sections added since last save show up.
          const order = reconcileSectionOrder('nomad', data.settings.section_order)
          const rawShape = data.settings.button_shape as string | null | undefined
          const button_shape: ButtonShape =
            rawShape && (BUTTON_SHAPE_KEYS as readonly string[]).includes(rawShape)
              ? (rawShape as ButtonShape)
              : 'rounded'
          const rawBgMode = data.settings.background_mode as string | null | undefined
          const background_mode: BackgroundMode =
            rawBgMode && (BACKGROUND_MODE_KEYS as readonly string[]).includes(rawBgMode)
              ? (rawBgMode as BackgroundMode)
              : 'theme'
          const rawFont = data.settings.font_family as string | null | undefined
          const font_family: FontKey =
            rawFont && (FONT_KEYS as readonly string[]).includes(rawFont)
              ? (rawFont as FontKey)
              : 'theme'
          setSettings({
            theme_color: normalizeTheme(data.settings.theme_color),
            button_shape,
            background_mode,
            background_value: data.settings.background_value ?? null,
            font_family,
            section_order: order,
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
                // No handle yet means the user hasn't claimed a card — go
                // straight to /create-card. The previous order (subscribe →
                // claim) trapped users at the pricing gate because the
                // public.users row didn't exist for the webhook to update.
                <Link
                  href="/create-card"
                  className="text-sm font-medium bg-gray-900 text-white px-4 py-2 rounded-full hover:bg-gray-800 transition"
                >
                  {tNav('getCard')}
                </Link>
              )}
            </div>
          </div>
        </nav>

        {/* Bottom padding has to clear the fixed save bar at the bottom; the
            previous pb-32 (8rem) left almost no breathing room and the last
            section's content was getting visually clipped. */}
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14 pb-48">
          <header className="mb-10">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-2">
              {t('title')}
            </h1>
            <p className="text-gray-600">
              {t('subtitle')}
            </p>
          </header>

          <div className="space-y-10">
            {/* Profile info — the most-edited surface area. Routes to
                /create-card (edit mode) since that's where the actual
                profile fields live. Keeping settings as the central hub
                even though the form is hosted elsewhere. */}
            <Section
              title={t('profile.title')}
              description={t('profile.description')}
            >
              <Link
                href="/create-card"
                className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full border border-gray-300 hover:border-gray-900 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {t('profile.edit')}
              </Link>
            </Section>

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
                  href={`/preview?theme=${settings.theme_color || 'classic'}&shape=${settings.button_shape || 'rounded'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-700 underline underline-offset-2 hover:text-gray-900"
                >
                  /preview
                </a>
                .
              </p>
            </Section>

            {/* Background — solid or gradient overrides the theme's
                outer bg. Six preset gradients give a one-click "looks
                nice" path; two color inputs let users fine-tune. The
                live preview swatch above the picker reflects the
                current setting so users don't have to leave the page. */}
            <Section
              title={t('background.title')}
              description={t('background.description')}
            >
              {(() => {
                const mode = settings.background_mode ?? 'theme'
                const bgValue = settings.background_value ?? null
                const previewCss = resolveBackgroundCss(mode, bgValue)
                const gradient =
                  bgValue && 'from' in bgValue
                    ? bgValue
                    : { from: '#667eea', to: '#764ba2', angle: 135 }
                const solidColor = bgValue && 'color' in bgValue ? bgValue.color : '#1a1a1a'
                return (
                  <div className="space-y-4">
                    <div
                      className="h-20 rounded-xl border border-gray-200"
                      style={previewCss ? { background: previewCss } : { background: '#f3f4f6' }}
                      aria-hidden
                    />
                    <div className="grid grid-cols-3 gap-2 max-w-md">
                      {BACKGROUND_MODE_KEYS.map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setSettings((prev) => ({
                              ...prev,
                              background_mode: key,
                              background_value:
                                key === 'theme'
                                  ? null
                                  : key === 'solid'
                                    ? { color: solidColor }
                                    : gradient,
                            }))
                          }}
                          className={`px-3 py-2 rounded-lg border text-sm font-medium transition ${
                            mode === key
                              ? 'border-gray-900 bg-gray-900 text-white'
                              : 'border-gray-200 text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {t(`background.${key}`)}
                        </button>
                      ))}
                    </div>

                    {mode === 'solid' && (
                      <label className="flex items-center gap-3 text-sm text-gray-700">
                        <input
                          type="color"
                          value={solidColor}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              background_value: { color: e.target.value },
                            }))
                          }
                          className="w-12 h-12 rounded-lg border border-gray-200 cursor-pointer"
                        />
                        <span className="font-mono">{solidColor}</span>
                      </label>
                    )}

                    {mode === 'gradient' && (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {GRADIENT_PRESETS.map((p, i) => (
                            <button
                              key={i}
                              type="button"
                              aria-label={`Gradient preset ${i + 1}`}
                              onClick={() =>
                                setSettings((prev) => ({
                                  ...prev,
                                  background_value: { ...p },
                                }))
                              }
                              className="w-10 h-10 rounded-lg border border-gray-200 hover:border-gray-400 transition"
                              style={{
                                background: `linear-gradient(${p.angle}deg, ${p.from}, ${p.to})`,
                              }}
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-4 flex-wrap">
                          <label className="flex items-center gap-2 text-sm text-gray-700">
                            <span className="text-xs uppercase tracking-wide text-gray-500">{t('background.from')}</span>
                            <input
                              type="color"
                              value={gradient.from}
                              onChange={(e) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  background_value: { ...gradient, from: e.target.value },
                                }))
                              }
                              className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                            />
                          </label>
                          <label className="flex items-center gap-2 text-sm text-gray-700">
                            <span className="text-xs uppercase tracking-wide text-gray-500">{t('background.to')}</span>
                            <input
                              type="color"
                              value={gradient.to}
                              onChange={(e) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  background_value: { ...gradient, to: e.target.value },
                                }))
                              }
                              className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                            />
                          </label>
                          <label className="flex items-center gap-2 text-sm text-gray-700">
                            <span className="text-xs uppercase tracking-wide text-gray-500">{t('background.angle')}</span>
                            <input
                              type="range"
                              min={0}
                              max={360}
                              value={gradient.angle}
                              onChange={(e) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  background_value: {
                                    ...gradient,
                                    angle: Number(e.target.value),
                                  },
                                }))
                              }
                              className="w-32"
                            />
                            <span className="font-mono text-xs w-10 text-right">{gradient.angle}°</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
            </Section>

            {/* Button shape — orthogonal to theme color. Three radius
                presets; the segmented control's visual preview (each
                button's own corners) is the strongest signal of what
                each option does without needing a label-only chip. */}
            <Section
              title={t('buttonShape.title')}
              description={t('buttonShape.description')}
            >
              <div className="grid grid-cols-3 gap-2 max-w-md">
                {BUTTON_SHAPE_KEYS.map((key) => {
                  const active = settings.button_shape === key
                  const shapeClass =
                    key === 'pill'
                      ? 'rounded-full'
                      : key === 'square'
                        ? 'rounded-none'
                        : 'rounded-xl'
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSettings((prev) => ({ ...prev, button_shape: key }))}
                      className={`flex flex-col items-center gap-2 p-3 border transition ${
                        active
                          ? 'border-gray-900 bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${shapeClass}`}
                    >
                      <div
                        className={`w-full h-7 bg-gray-900 ${shapeClass}`}
                        aria-hidden
                      />
                      <span className="text-xs font-medium text-gray-700">
                        {t(`buttonShape.${key}`)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </Section>

            {/* Font family — orthogonal to theme. Each option renders its
                own label in its own font so the picker is its own preview. */}
            <Section
              title={t('font.title')}
              description={t('font.description')}
            >
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                {FONT_OPTIONS.map((opt) => {
                  const active = (settings.font_family ?? 'theme') === opt.key
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setSettings((prev) => ({ ...prev, font_family: opt.key }))}
                      className={`px-3 py-3 rounded-lg border text-base text-center transition ${opt.className} ${
                        active
                          ? 'border-gray-900 bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {opt.key === 'theme' ? t('font.themeDefault') : opt.label}
                    </button>
                  )
                })}
              </div>
            </Section>

            {/* Sections — reorder only. Empty sections already auto-hide in
                NomadCard, so the old show/hide toggle was redundant.
                Reordering is niche so we tuck it behind a disclosure with
                a sliders icon + "Advanced" pill to signal "power-user
                territory; safe to skip". */}
            <details className="group">
              <summary className="cursor-pointer list-none flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition">
                <svg
                  className="w-4 h-4 transition group-open:rotate-90 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <svg
                  className="w-4 h-4 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h12M3 12h7m-7 6h12M17 4v4m0 4v4m0 4v0M21 8h-8m8 8h-8" />
                </svg>
                {t('sections.title')}
                <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wide bg-gray-100 text-gray-500 border border-gray-200">
                  {t('sections.advancedLabel')}
                </span>
              </summary>
              <p className="mt-2 ml-6 text-xs text-gray-500">{t('sections.description')}</p>
              <div className="mt-4 space-y-2">
                {(() => {
                  const defs = NOMAD_SECTIONS
                  const order = settings.section_order ?? NOMAD_DEFAULT_ORDER
                  return order
                    .map((id) => defs.find((d) => d.id === id))
                    .filter((d): d is SectionDef => Boolean(d))
                    .map((section, idx, arr) => {
                      const isFirst = idx === 0
                      const isLast = idx === arr.length - 1
                      return (
                        <div
                          key={section.id}
                          className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900">{section.label}</div>
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
            </details>

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
