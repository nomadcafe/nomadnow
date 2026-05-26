'use client'

import React, { useState, useEffect, useMemo, useDeferredValue } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import Image from 'next/image'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/Toast'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Logo } from '@/components/Logo'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { NomadCard } from '@/components/NomadCard'
import { createBrowserSupabase } from '@/lib/supabase/browser'
import {
  THEMES,
  THEME_KEYS,
  BUTTON_SHAPE_KEYS,
  DECORATION_KEYS,
  AVATAR_STYLE_KEYS,
  BIO_QUOTE_STYLE_KEYS,
  type ThemeKey,
  type ButtonShape,
} from '@/lib/themes'
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
import type { User, NomadLink, NomadStay, NomadBlurb } from '@/types/database'

interface ProfileData {
  user: User
  links: NomadLink[]
  stays: NomadStay[]
  blurbs: NomadBlurb[]
}

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
  // Hex accent override (#RRGGBB). null = inherit theme preset's accentHex.
  accent_color?: string | null
  // Per-axis preset unbundling. null on each = inherit chosen theme's value.
  decoration_override?: string | null
  avatar_style_override?: string | null
  bio_quote_style_override?: string | null
  section_order?: string[]
}

function normalizeTheme(value: unknown): ThemeKey {
  if (typeof value === 'string' && (THEME_KEYS as string[]).includes(value)) {
    return value as ThemeKey
  }
  // Legacy DB values ('blue', 'purple' etc) fall back to 'classic' on first save.
  return 'classic'
}

// Theme / appearance editor — the "Look" tab of /edit. Owns the settings
// state, dirty flag, save handler, and the embedded live preview. Hosted by
// /edit/look (a thin wrapper). Account-only concerns (billing, sign-out,
// profile link) live in a sibling AccountSection; this form never touches
// billing endpoints.
export function LookSettingsForm() {
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
  const DEFAULT_SETTINGS: ProfileSettings = {
    theme_color: 'classic',
    button_shape: 'rounded',
    background_mode: 'theme',
    background_value: null,
    font_family: 'theme',
    accent_color: null,
    decoration_override: null,
    avatar_style_override: null,
    bio_quote_style_override: null,
    section_order: NOMAD_DEFAULT_ORDER,
  }
  const [settings, setSettings] = useState<ProfileSettings>(DEFAULT_SETTINGS)
  // Snapshot of the last saved state, used to compute the dirty flag and
  // to power the Reset button. JSON string for a cheap deep-equal.
  const [savedSerialized, setSavedSerialized] = useState<string>(
    JSON.stringify(DEFAULT_SETTINGS),
  )
  // Real profile payload for the live preview. Fetched from /api/profile/[handle]
  // after we know the user's handle. Null = no card yet (point to /create-card).
  const [previewData, setPreviewData] = useState<ProfileData | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const isDirty = useMemo(
    () => JSON.stringify(settings) !== savedSerialized,
    [settings, savedSerialized],
  )
  // Dragging the color / angle inputs fires onChange on every pixel of
  // movement, and the embedded NomadCard preview (theme, fonts, WorldMap
  // SVG, etc.) is expensive to re-render. useDeferredValue lets React
  // keep the input responsive by rendering the preview with a slightly
  // stale settings snapshot that catches up when the user pauses.
  const deferredSettings = useDeferredValue(settings)

  useEffect(() => {
    async function load() {
      const supabase = createBrowserSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login?next=/edit/look')
        return
      }

      // Handle drives the preview fetch; settings drives the form. Both
      // reads are independent so fire them in parallel. Billing lives on
      // a sibling component (AccountSection) and is not needed here.
      const [handleResult, settingsRes] = await Promise.all([
        supabase.from('users').select('handle').eq('id', user.id).maybeSingle(),
        fetch('/api/settings').catch(() => null),
      ])

      if (handleResult.data?.handle) setHandle(handleResult.data.handle as string)

      try {
        const data = settingsRes ? await settingsRes.json() : null
        if (data?.success && data.settings) {
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
          const rawAccent = data.settings.accent_color as string | null | undefined
          // Same #RGB / #RRGGBB / #RRGGBBAA shape as background_value's hex.
          // Anything else (legacy junk, partial typing) drops to null so the
          // theme preset's accent renders unchanged.
          const accent_color: string | null =
            typeof rawAccent === 'string' && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(rawAccent)
              ? rawAccent
              : null
          // The three preset-unbundle overrides. Pass through verbatim — the
          // server-side render's getTheme() validates against the catalog and
          // drops anything unknown to the theme's baked-in value.
          const decoration_override = (data.settings.decoration_override as string | null | undefined) ?? null
          const avatar_style_override = (data.settings.avatar_style_override as string | null | undefined) ?? null
          const bio_quote_style_override = (data.settings.bio_quote_style_override as string | null | undefined) ?? null
          const loaded: ProfileSettings = {
            theme_color: normalizeTheme(data.settings.theme_color),
            button_shape,
            background_mode,
            background_value: data.settings.background_value ?? null,
            font_family,
            accent_color,
            decoration_override,
            avatar_style_override,
            bio_quote_style_override,
            section_order: order,
          }
          setSettings(loaded)
          setSavedSerialized(JSON.stringify(loaded))
        }
      } catch (error) {
        console.error('Error loading settings:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
    // DEFAULT_SETTINGS is a stable object literal — re-creating it each
    // render is fine since the effect only depends on router.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  // Live-preview profile fetch — pulls the user's actual user / links /
  // stays so the embedded NomadCard reflects real content, not mock data.
  // Triggered once we know the handle. Lookup uses the public API which
  // already caches with the same ETag the public /[handle] page uses.
  useEffect(() => {
    if (!handle) return
    let alive = true
    setPreviewLoading(true)
    fetch(`/api/profile/${handle}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive || !data?.user) return
        setPreviewData({
          user: data.user as User,
          links: (data.nomadLinks ?? []) as NomadLink[],
          stays: (data.nomadStays ?? []) as NomadStay[],
          blurbs: (data.nomadBlurbs ?? []) as NomadBlurb[],
        })
      })
      .catch(() => {
        // Preview is non-essential — the settings UI itself still works.
      })
      .finally(() => {
        if (alive) setPreviewLoading(false)
      })
    return () => {
      alive = false
    }
  }, [handle])

  // Browser-native unsaved-changes guard. Custom messages aren't shown by
  // any modern browser; setting returnValue is enough to trigger the
  // generic "leave site?" prompt.
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

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

      // Stay on the page after save — the previous behaviour bounced the
      // user to /{handle} after 1.2s which was disorienting (they often
      // wanted to keep tweaking). The toast confirms the save; a separate
      // "View live card" link is always visible if they want to switch.
      showSuccess(t('saved'))
      setSavedSerialized(JSON.stringify(settings))
    } catch (error) {
      console.error('Error saving settings:', error)
      showError(error instanceof Error ? error.message : t('saveError'))
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    try {
      const restored = JSON.parse(savedSerialized) as ProfileSettings
      setSettings(restored)
    } catch {
      setSettings(DEFAULT_SETTINGS)
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

  // Drag-and-drop state for section reordering. Uses native HTML5 drag
  // events (no library) — works great on desktop pointers. The up/down
  // arrow buttons stay as the fallback for touch / keyboard users since
  // HTML5 DnD is awkward on mobile.
  const [dragSourceId, setDragSourceId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const reorderSection = (fromId: string, toId: string) => {
    if (fromId === toId) return
    setSettings((prev) => {
      const order = [...(prev.section_order ?? [])]
      const from = order.indexOf(fromId)
      const to = order.indexOf(toId)
      if (from === -1 || to === -1) return prev
      const [moved] = order.splice(from, 1)
      order.splice(to, 0, moved)
      return { ...prev, section_order: order }
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
      <div className="bg-white text-gray-900">
        {/* Bottom padding clears the fixed save bar (~85px tall). Explicit
            pt-/pb- rather than py-N + pb-N — Tailwind's utility output order
            isn't guaranteed and py-N can silently override pb-N, leaving the
            last section visually clipped by the save bar. */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-48">

          {/* Two columns on lg+ when there's a preview (look or full mode).
              Account-only mode collapses to single column. */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-8 lg:gap-12">
            <div className="space-y-10">
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
                    user={previewData?.user}
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

            {/* Accent color — overrides the theme preset's accentHex.
                Repaints links, both CTAs, brand-chip tints on monochrome
                platforms, and the map's city dots. NULL = use the preset's
                default so the picker still shows where you're starting from. */}
            <Section
              title={t('accent.title')}
              description={t('accent.description')}
            >
              {(() => {
                const themePreset = THEMES[settings.theme_color ?? 'classic']
                const themeDefaultAccent = themePreset.accentHex
                const override = settings.accent_color ?? null
                const effectiveAccent = override || themeDefaultAccent
                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <input
                        type="color"
                        value={effectiveAccent}
                        onChange={(e) =>
                          setSettings((prev) => ({ ...prev, accent_color: e.target.value }))
                        }
                        className="w-12 h-12 rounded-lg border border-gray-200 cursor-pointer"
                        aria-label={t('accent.pickerLabel')}
                      />
                      <span className="font-mono text-sm text-gray-700">{effectiveAccent}</span>
                      {override && (
                        <button
                          type="button"
                          onClick={() =>
                            setSettings((prev) => ({ ...prev, accent_color: null }))
                          }
                          className="text-xs text-gray-500 hover:text-gray-900 underline underline-offset-2 transition"
                        >
                          {t('accent.useThemeDefault')}
                        </button>
                      )}
                    </div>
                    {override && (
                      <p className="text-xs text-gray-500">
                        {t('accent.themeDefaultLabel')}{' '}
                        <span className="font-mono">{themeDefaultAccent}</span>
                      </p>
                    )}
                  </div>
                )
              })()}
            </Section>

            {/* Theme overrides — mix-and-match across presets. Each axis
                (decoration / avatar / bio quote) defaults to the preset's
                baked-in choice when its override is null; setting any axis
                pins it to the user's pick regardless of which theme is
                selected. */}
            <Section
              title={t('overrides.title')}
              description={t('overrides.description')}
            >
              {(() => {
                const themePreset = THEMES[settings.theme_color ?? 'classic']
                const decorationDefault = themePreset.decoration
                const avatarDefault = themePreset.avatarStyle
                const bioDefault = themePreset.bioQuoteStyle
                const decorationOverride = settings.decoration_override ?? null
                const avatarOverride = settings.avatar_style_override ?? null
                const bioOverride = settings.bio_quote_style_override ?? null
                const tDecoration = (key: string) =>
                  // Maps `mono-grid` → key in the i18n namespace.
                  t(`overrides.decoration.${key}`)
                const tAvatar = (key: string) => t(`overrides.avatar.${key}`)
                const tBio = (key: string) => t(`overrides.bioQuote.${key}`)
                return (
                  <div className="space-y-6">
                    <OverrideRow
                      label={t('overrides.decorationLabel')}
                      defaultKey={decorationDefault}
                      override={decorationOverride}
                      options={DECORATION_KEYS as readonly string[]}
                      tLabel={tDecoration}
                      onSelect={(key) =>
                        setSettings((prev) => ({ ...prev, decoration_override: key }))
                      }
                      resetLabel={t('overrides.useThemeDefault')}
                      defaultBadgeLabel={t('overrides.themeDefaultBadge')}
                    />
                    <OverrideRow
                      label={t('overrides.avatarLabel')}
                      defaultKey={avatarDefault}
                      override={avatarOverride}
                      options={AVATAR_STYLE_KEYS as readonly string[]}
                      tLabel={tAvatar}
                      onSelect={(key) =>
                        setSettings((prev) => ({ ...prev, avatar_style_override: key }))
                      }
                      resetLabel={t('overrides.useThemeDefault')}
                      defaultBadgeLabel={t('overrides.themeDefaultBadge')}
                    />
                    <OverrideRow
                      label={t('overrides.bioQuoteLabel')}
                      defaultKey={bioDefault}
                      override={bioOverride}
                      options={BIO_QUOTE_STYLE_KEYS as readonly string[]}
                      tLabel={tBio}
                      onSelect={(key) =>
                        setSettings((prev) => ({ ...prev, bio_quote_style_override: key }))
                      }
                      resetLabel={t('overrides.useThemeDefault')}
                      defaultBadgeLabel={t('overrides.themeDefaultBadge')}
                    />
                  </div>
                )
              })()}
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
                      const isDragSource = dragSourceId === section.id
                      const isDragOver =
                        dragOverId === section.id && dragSourceId && dragSourceId !== section.id
                      return (
                        <div
                          key={section.id}
                          draggable
                          onDragStart={(e) => {
                            setDragSourceId(section.id)
                            e.dataTransfer.effectAllowed = 'move'
                            // Required for Firefox — drag won't start without
                            // something on the dataTransfer.
                            e.dataTransfer.setData('text/plain', section.id)
                          }}
                          onDragOver={(e) => {
                            e.preventDefault()
                            e.dataTransfer.dropEffect = 'move'
                            if (dragSourceId && dragSourceId !== section.id) {
                              setDragOverId(section.id)
                            }
                          }}
                          onDragLeave={(e) => {
                            // Only clear the highlight when leaving the row
                            // itself, not a child element.
                            if (e.currentTarget === e.target) setDragOverId(null)
                          }}
                          onDrop={(e) => {
                            e.preventDefault()
                            if (dragSourceId) reorderSection(dragSourceId, section.id)
                            setDragSourceId(null)
                            setDragOverId(null)
                          }}
                          onDragEnd={() => {
                            setDragSourceId(null)
                            setDragOverId(null)
                          }}
                          className={`flex items-center gap-3 p-3 rounded-xl border bg-white transition cursor-grab active:cursor-grabbing ${
                            isDragSource
                              ? 'opacity-40 border-gray-200'
                              : isDragOver
                                ? 'border-gray-900 ring-2 ring-gray-900/10'
                                : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {/* Grip handle — visual cue that the card is
                              draggable. Inactive on click; the whole row
                              is the drag target. */}
                          <svg
                            className="w-4 h-4 text-gray-300 shrink-0"
                            fill="currentColor"
                            viewBox="0 0 16 16"
                            aria-hidden="true"
                          >
                            <circle cx="5" cy="3" r="1" />
                            <circle cx="5" cy="8" r="1" />
                            <circle cx="5" cy="13" r="1" />
                            <circle cx="11" cy="3" r="1" />
                            <circle cx="11" cy="8" r="1" />
                            <circle cx="11" cy="13" r="1" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900">{section.label}</div>
                            <div className="text-xs text-gray-500 truncate">{section.description}</div>
                          </div>
                          {/* Keyboard / mobile fallback — HTML5 DnD is rough
                              on touch, so up/down stays even after DnD lands. */}
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

            </div>

            {/* Live preview column — sticky on lg+ so it stays in view while
                the user scrolls through the long control list. Renders the
                user's actual card with the current draft settings, so every
                tweak (theme / shape / bg / font / section order /
                branding) is visible before the user commits via Save. */}
            <aside className="lg:sticky lg:top-24 lg:self-start lg:h-fit">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                  {t('preview.title')}
                </h2>
                {handle && (
                  <a
                    href={`/${handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-500 hover:text-gray-900 transition inline-flex items-center gap-1"
                  >
                    {t('preview.openFull')}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </a>
                )}
              </div>
              <div className="rounded-2xl border border-gray-200 overflow-hidden bg-gray-50">
                {previewData ? (
                  <NomadCard
                    user={previewData.user}
                    links={previewData.links}
                    stays={previewData.stays}
                    blurbs={previewData.blurbs}
                    themeKey={deferredSettings.theme_color}
                    buttonShape={deferredSettings.button_shape}
                    backgroundMode={deferredSettings.background_mode}
                    backgroundValue={deferredSettings.background_value}
                    fontFamily={deferredSettings.font_family}
                    accentColor={deferredSettings.accent_color}
                    decorationOverride={deferredSettings.decoration_override}
                    avatarStyleOverride={deferredSettings.avatar_style_override}
                    bioQuoteStyleOverride={deferredSettings.bio_quote_style_override}
                    sectionOrder={deferredSettings.section_order}
                    embedded
                  />
                ) : previewLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <LoadingSpinner size="md" />
                  </div>
                ) : (
                  <div className="p-8 text-center text-sm text-gray-500">
                    <p className="mb-3">{t('preview.noCard')}</p>
                    <Link
                      href="/create-card"
                      className="inline-flex items-center gap-1.5 text-gray-900 font-medium hover:underline"
                    >
                      {t('preview.createCard')}
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </Link>
                  </div>
                )}
              </div>
              {isDirty && previewData && (
                <p className="mt-3 text-xs text-amber-600 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  {t('preview.unsavedHint')}
                </p>
              )}
            </aside>
          </div>
        </main>

        {/* Sticky save bar — shows a dirty pill on the left so the user
            knows their changes haven't gone out yet. Save is disabled
            when clean (no-op POSTs are wasted round-trips); Reset shows
            up only when dirty (no point in resetting a clean state). */}
        <div className="fixed bottom-0 inset-x-0 z-40 border-t border-gray-100 bg-white/95 backdrop-blur">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
            {isDirty && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {t('unsavedChanges')}
              </span>
            )}
            {isDirty && (
              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                className="px-4 py-3 text-gray-600 hover:text-gray-900 rounded-full font-medium transition text-sm disabled:opacity-40"
              >
                {t('reset')}
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !isDirty}
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

// Row used by the theme-override section — a small label, then a segmented
// strip of options. Active option = explicit override OR (no override AND
// option equals the theme preset's value for this axis). A small badge marks
// the preset's default so users see what they're starting from. Clicking
// "Use theme default" clears the override.
function OverrideRow({
  label,
  defaultKey,
  override,
  options,
  tLabel,
  onSelect,
  resetLabel,
  defaultBadgeLabel,
}: {
  label: string
  defaultKey: string
  override: string | null
  options: readonly string[]
  tLabel: (key: string) => string
  onSelect: (key: string | null) => void
  resetLabel: string
  defaultBadgeLabel: string
}) {
  const effective = override ?? defaultKey
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <span className="text-sm font-medium text-gray-900">{label}</span>
        {override !== null && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-xs text-gray-500 hover:text-gray-900 underline underline-offset-2 transition"
          >
            {resetLabel}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((key) => {
          const isActive = effective === key
          const isDefault = key === defaultKey
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition ${
                isActive
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tLabel(key)}</span>
              {isDefault && (
                <span
                  className={`ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${
                    isActive
                      ? 'bg-white/15 text-white'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                  aria-label={defaultBadgeLabel}
                >
                  {defaultBadgeLabel}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
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
  user,
}: {
  themeKey: ThemeKey
  active: boolean
  onClick: () => void
  // Optional — when present the tile shows the user's real avatar + name
  // inside the mini card, so each tile previews "what my card looks like
  // under this theme" rather than abstract placeholder dots.
  user?: { avatar_url?: string | null; display_name?: string | null; handle?: string | null }
}) {
  const theme = THEMES[themeKey]
  const displayName = user?.display_name || user?.handle || null
  const initials = displayName
    ? displayName
        .split(/\s+/)
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : null
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-label={`Theme: ${theme.label}`}
      className={`group text-left rounded-2xl overflow-hidden border-2 transition focus:outline-none focus:ring-2 focus:ring-gray-900/20 ${
        active ? 'border-gray-900 ring-2 ring-gray-900/10 ring-offset-2' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Mini preview surface: applies the theme's page background + a
          smaller card. When we have the user's real data the avatar +
          name + a sample link chip render in the theme's actual styles
          — much more telling than the abstract dots we used to show. */}
      <div className={`${theme.page} ${theme.font} p-3 h-28 flex items-center justify-center`}>
        <div className={`${theme.card} ${theme.text} w-full p-2.5 flex flex-col items-center gap-1.5`}>
          {user?.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt=""
              width={28}
              height={28}
              sizes="28px"
              className="w-7 h-7 rounded-full object-cover"
            />
          ) : initials ? (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-semibold text-white"
              style={{ background: `linear-gradient(135deg, ${theme.accentHex}, ${theme.accentHex}aa)` }}
            >
              {initials}
            </div>
          ) : (
            <div
              className="w-7 h-7 rounded-full"
              style={{ background: `linear-gradient(135deg, ${theme.accentHex}, ${theme.accentHex}aa)` }}
            />
          )}
          {displayName ? (
            <div className="text-[9px] font-semibold leading-tight truncate max-w-full px-1">
              {displayName}
            </div>
          ) : (
            <div className="h-1.5 w-12 rounded-full" style={{ background: 'currentColor', opacity: 0.55 }} />
          )}
          {/* Sample link chip — uses the theme's linkRow class so the
              accent button style itself becomes part of the preview. */}
          <div className={`mt-0.5 h-3 w-full rounded-md ${theme.linkRow} flex items-center justify-center`}>
            <span className="h-1 w-3 rounded-full" style={{ background: theme.accentHex, opacity: 0.85 }} />
            <span className="ml-1 h-0.5 w-6 rounded-full" style={{ background: 'currentColor', opacity: 0.4 }} />
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
