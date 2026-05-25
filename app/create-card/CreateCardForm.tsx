'use client'

import React, { useState, useEffect, useCallback, useDeferredValue, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/Toast'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { CountrySelector } from '@/components/CountrySelector'
import { AvatarUploader } from '@/components/AvatarUploader'
import { LiveCardPreview, isPreviewEmpty } from '@/components/LiveCardPreview'
import { StaysEditor, type StayDraft } from '@/components/StaysEditor'
import { Logo } from '@/components/Logo'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { debounce } from '@/lib/debounce'
import {
  DRAFT_STORAGE_KEY,
  LINK_CAP,
  ROLES,
  TIMEZONE_LIST,
  WORK_STATUS_PRESETS,
  detectBrowserTimezone,
  type HandleStatus,
  type NomadLinkDraft,
} from './form-constants'
import {
  CompletionMeter,
  HandleField,
  LinksField,
  WorkStatusField,
} from './form-sections'

// Server-injected snapshot. When non-null the form switches to edit mode:
// fields pre-populate, handle becomes read-only, submit hits PUT.
export interface InitialCardData {
  handle: string
  display_name: string
  role: string
  bio: string
  current_city: string
  avatar_url: string
  // Free-form string. Preset slugs (busy / freelancing / fulltime) get
  // their localised labels on the card; anything else renders verbatim.
  work_status: string
  timezone: string
  visited_countries: string[]
  links: NomadLinkDraft[]
  stays: StayDraft[]
}

export default function CreateCardForm({ initial }: { initial?: InitialCardData | null }) {
  const isEdit = Boolean(initial)
  const t = useTranslations('createCard')
  const tStays = useTranslations('stays')
  const tRole = useTranslations('roles')
  const router = useRouter()
  const { toasts, showError, removeToast } = useToast()
  const [loading, setLoading] = useState(false)
  // In edit mode the handle is the server-provided value and is locked, so
  // there's nothing to validate; pretend it's "available" so the submit
  // button doesn't get disabled by `handleStatus !== 'available'`.
  const [handleStatus, setHandleStatus] = useState<HandleStatus>(isEdit ? 'available' : 'idle')
  const [handleError, setHandleError] = useState<string>('')
  const [showMore, setShowMore] = useState(isEdit)

  const loadDraft = () => {
    // Edit mode ignores the localStorage draft — it was captured during a
    // previous create attempt and shouldn't bleed into an existing card.
    if (isEdit || typeof window === 'undefined') return null
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch {
      // Ignore parse errors
    }
    return null
  }

  const savedDraft = loadDraft()
  const [formData, setFormData] = useState({
    handle: initial?.handle ?? savedDraft?.handle ?? '',
    display_name: initial?.display_name ?? savedDraft?.display_name ?? '',
    role: initial?.role ?? savedDraft?.role ?? '',
    bio: initial?.bio ?? savedDraft?.bio ?? '',
    current_city: initial?.current_city ?? savedDraft?.current_city ?? '',
    // work_status is now free-form. Default to '' (no status pill on the
    // card) so new users aren't auto-assigned something they didn't pick.
    work_status: initial?.work_status ?? savedDraft?.work_status ?? '',
    avatar_url: initial?.avatar_url ?? savedDraft?.avatar_url ?? '',
    // Default: existing card → keep its value; new card → detect from browser
    // so the live local-time feature on the card works out of the box for
    // people who never touch the dropdown.
    timezone: initial?.timezone ?? savedDraft?.timezone ?? '',
  })
  const [visitedCountries, setVisitedCountries] = useState<string[]>(
    initial?.visited_countries ?? savedDraft?.visitedCountries ?? [],
  )
  const [links, setLinks] = useState<NomadLinkDraft[]>(initial?.links ?? savedDraft?.links ?? [])
  const [stays, setStays] = useState<StayDraft[]>(initial?.stays ?? savedDraft?.stays ?? [])

  // Every keystroke in the bio textarea / name / city inputs triggers a full
  // re-render of the embedded NomadCard preview (and its WorldMap SVG).
  // useDeferredValue lets React keep the inputs responsive — the preview
  // renders against a slightly stale snapshot that catches up when idle.
  const deferredFormData = useDeferredValue(formData)
  const deferredLinks = useDeferredValue(links)
  const deferredStays = useDeferredValue(stays)
  const deferredVisitedCountries = useDeferredValue(visitedCountries)

  // Auto-expand the optional section if the user has any saved draft data in it,
  // so they don't lose visibility into in-progress work.
  // Also: if the page was opened with ?handle=xxx (e.g. from the 404 "Claim this"
  // CTA), prefill that handle, overriding any saved draft so the intent is honored.
  useEffect(() => {
    if (
      savedDraft &&
      (savedDraft.role || savedDraft.bio ||
        (savedDraft.visitedCountries?.length ?? 0) > 0 ||
        (savedDraft.links?.length ?? 0) > 0 ||
        savedDraft.avatar_url)
    ) {
      setShowMore(true)
    }

    if (typeof window !== 'undefined') {
      const prefill = new URLSearchParams(window.location.search).get('handle')
      if (prefill) {
        const cleaned = prefill.trim().toLowerCase().slice(0, 50)
        if (cleaned) {
          setFormData((prev) => ({ ...prev, handle: cleaned }))
        }
      }
    }

    // Seed timezone from the browser only when nothing's stored yet — never
    // overwrite an existing card's saved zone (the user might be in a coffee
    // shop in Lisbon but still want their card to say Bangkok).
    setFormData((prev) => {
      if (prev.timezone) return prev
      return { ...prev, timezone: detectBrowserTimezone() }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (isEdit || typeof window === 'undefined') return
    try {
      const draft = { ...formData, visitedCountries, links, stays }
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
    } catch {
      // Ignore storage errors
    }
  }, [formData, visitedCountries, links, stays, isEdit])

  const clearDraft = () => {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY)
    } catch {
      // Ignore
    }
  }

  // Tracks the in-flight handle-check request so a slow response for an
  // older handle (network jitter) can't overwrite a fresh fast response.
  const handleCheckAbortRef = useRef<AbortController | null>(null)

  const checkHandleAvailability = useCallback(
    debounce(async (handle: string) => {
      if (!handle.trim()) {
        setHandleStatus('idle')
        return
      }

      const handleRegex = /^[a-zA-Z0-9_-]+$/
      if (!handleRegex.test(handle) || handle.length < 2 || handle.length > 50) {
        setHandleStatus('invalid')
        setHandleError(t('handleInvalid'))
        return
      }

      handleCheckAbortRef.current?.abort()
      const controller = new AbortController()
      handleCheckAbortRef.current = controller

      setHandleStatus('checking')
      try {
        const response = await fetch(
          `/api/users/check-handle?handle=${encodeURIComponent(handle.toLowerCase())}`,
          { signal: controller.signal },
        )
        const data = await response.json()

        if (data.available) {
          setHandleStatus('available')
          setHandleError('')
        } else {
          setHandleStatus('unavailable')
          setHandleError(t('handleTaken'))
        }
      } catch (err) {
        // AbortError fires when a newer keystroke superseded this check —
        // not an error to surface to the user; the next call's response wins.
        if (err instanceof DOMException && err.name === 'AbortError') return
        setHandleStatus('idle')
        setHandleError(t('handleCheckError'))
      }
    }, 500),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  useEffect(() => {
    // Skip availability checks in edit mode — handle is locked.
    if (isEdit) return
    checkHandleAvailability(formData.handle)
  }, [formData.handle, checkHandleAvailability, isEdit])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.handle.trim() || handleStatus !== 'available') {
      showError(t('errorHandle'))
      return
    }
    if (!formData.display_name.trim()) {
      showError(t('errorName'))
      return
    }

    const validLinks = links.filter((link) => link.url.trim())
    if (validLinks.length > LINK_CAP) {
      showError(t('errorTooManyLinks', { cap: LINK_CAP }))
      return
    }

    setLoading(true)
    try {
      // Same payload shape regardless of mode — the API's create vs update
      // schemas are subsets of one another and the data we send is valid
      // under both. Only `handle` is omitted in edit mode (it's locked).
      const baseBody = {
        display_name: formData.display_name,
        bio: formData.bio || undefined,
        location: formData.current_city || undefined,
        avatar_url: formData.avatar_url || undefined,
        country: undefined,
        role: formData.role || undefined,
        current_city: formData.current_city || undefined,
        work_status: formData.work_status,
        timezone: formData.timezone || undefined,
        visited_countries: visitedCountries,
        profile_type: 'nomad',
      }

      const response = await fetch('/api/users', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isEdit
            ? baseBody
            : { ...baseBody, handle: formData.handle.trim().toLowerCase() },
        ),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || t('errorGeneric'))
      }

      // Links sync: replace-all in both modes. The server PUT atomically
      // wipes + reinserts in array order, so reorders and removals come
      // free. Skip the round-trip in create mode when there's nothing to
      // insert (matching the stays branch below).
      if (isEdit || validLinks.length > 0) {
        const linksResponse = await fetch('/api/nomad-links', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            links: validLinks.map((link) => ({
              type: link.type,
              label: link.type === 'other' ? link.label || null : null,
              url: link.url,
            })),
          }),
        })
        if (!linksResponse.ok) {
          const linksData = await linksResponse.json().catch(() => ({}))
          throw new Error(linksData.error || t('errorGeneric'))
        }
      }

      // Stays sync: replace-all in both modes. The form always submits the
      // full desired set; server wipes and re-inserts. Skip the PUT entirely
      // when the user has no stays (saves a round-trip).
      const validStays = stays.filter((s) => s.city.trim() && s.country && s.start_date)
      if (isEdit || validStays.length > 0) {
        const staysResponse = await fetch('/api/stays', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stays: validStays.map((s) => ({
              city: s.city.trim(),
              country: s.country,
              lat: s.lat ?? null,
              lon: s.lon ?? null,
              start_date: s.start_date,
              end_date: s.end_date || null,
              notes: s.notes?.trim() || null,
              photo_urls: s.photo_urls,
            })),
          }),
        })
        if (!staysResponse.ok) {
          const staysData = await staysResponse.json().catch(() => ({}))
          throw new Error(staysData.error || t('errorGeneric'))
        }
      }

      clearDraft()
      const handleSlug = (initial?.handle ?? formData.handle).trim().toLowerCase()
      // Edit mode: back to public card, no celebration (their card was
      // already live). Create mode: paid users land on a celebration-armed
      // version of their card so they're prompted to share; unpaid users
      // get bounced to /pricing first.
      let nextPath: string
      if (isEdit) {
        nextPath = `/${handleSlug}`
      } else {
        const claimedPlan = data?.user?.plan as 'basic' | 'pro' | null | undefined
        nextPath = claimedPlan ? `/${handleSlug}?celebrate=1` : '/pricing?from=create'
      }
      router.push(nextPath)
      router.refresh()
    } catch (error) {
      showError(error instanceof Error ? error.message : t('errorGeneric'))
    } finally {
      setLoading(false)
    }
  }

  const canSubmit =
    !loading &&
    formData.handle.trim() &&
    handleStatus === 'available' &&
    formData.display_name.trim()

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="min-h-screen bg-white text-gray-900">
        <nav className="border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur z-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
            <Logo />
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <Link
                href={isEdit && initial ? `/${initial.handle}` : '/'}
                className="text-sm text-gray-500 hover:text-gray-900 transition"
              >
                {t('navCancel')}
              </Link>
            </div>
          </div>
        </nav>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-12 xl:gap-16">
            <div className="min-w-0">
              <header className="mb-8 sm:mb-10">
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-2">
                  {isEdit ? t('editTitle') : t('title')}
                </h1>
                <p className="text-gray-600">
                  {isEdit ? t('editSubtitle') : t('subtitle')}
                </p>
              </header>

              <CompletionMeter
                items={[
                  { key: 'handle', filled: !!formData.handle.trim() },
                  { key: 'name', filled: !!formData.display_name.trim() },
                  { key: 'avatar', filled: !!formData.avatar_url },
                  { key: 'role', filled: !!formData.role },
                  { key: 'bio', filled: !!formData.bio.trim() },
                  { key: 'city', filled: !!formData.current_city.trim() },
                  { key: 'stays', filled: stays.some((s) => s.city.trim() && s.country && s.start_date) },
                  { key: 'countries', filled: visitedCountries.length > 0 },
                  { key: 'links', filled: links.some((l) => l.url.trim()) },
                ]}
              />

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Essentials */}
                <div className="space-y-5">
                  <HandleField
                    value={formData.handle}
                    onChange={(next) => setFormData((prev) => ({ ...prev, handle: next }))}
                    status={handleStatus}
                    error={handleError}
                    isEdit={isEdit}
                  />

                  {/* Name */}
                  <div>
                    <label htmlFor="display_name" className="block text-sm font-medium text-gray-900 mb-1.5">
                      {t('name')} <span className="text-gray-400">*</span>
                    </label>
                    <input
                      type="text"
                      id="display_name"
                      name="display_name"
                      value={formData.display_name}
                      onChange={handleChange}
                      required
                      maxLength={100}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 transition text-base"
                      placeholder={t('namePlaceholder')}
                    />
                  </div>

                  {/* Current city */}
                  <div>
                    <label htmlFor="current_city" className="block text-sm font-medium text-gray-900 mb-1.5">
                      {t('currentCity')}
                    </label>
                    <input
                      type="text"
                      id="current_city"
                      name="current_city"
                      value={formData.current_city}
                      onChange={handleChange}
                      maxLength={100}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 transition text-base"
                      placeholder={t('currentCityPlaceholder')}
                    />
                    <p className="mt-1.5 text-xs text-gray-500">{t('currentCityHint')}</p>
                  </div>

                  {/* Timezone — drives the live clock on the public card.
                      Defaults to the browser's detected zone so most users
                      never have to touch this; remains overrideable for
                      travelers who want their card to keep showing their
                      "home" timezone. */}
                  <div>
                    <label htmlFor="timezone" className="block text-sm font-medium text-gray-900 mb-1.5">
                      {t('timezone')}
                    </label>
                    <select
                      id="timezone"
                      name="timezone"
                      value={formData.timezone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 transition text-base bg-white"
                    >
                      {TIMEZONE_LIST.map((tz) => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                    <p className="mt-1.5 text-xs text-gray-500">{t('timezoneHint')}</p>
                  </div>
                </div>

                {/* Customize more — collapsible */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowMore((v) => !v)}
                    className="group flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition"
                    aria-expanded={showMore}
                    aria-controls="more-fields"
                  >
                    <svg
                      className={`w-4 h-4 transition ${showMore ? 'rotate-90' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {showMore ? t('collapse') : t('expand')}
                  </button>

                  {showMore && (
                    <div id="more-fields" className="mt-5 space-y-5 border-t border-gray-100 pt-6">
                      {/* Role + Work status */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="role" className="block text-sm font-medium text-gray-900 mb-1.5">
                            {t('role')}
                          </label>
                          <select
                            id="role"
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 transition bg-white text-base"
                          >
                            <option value="">—</option>
                            {ROLES.map((role) => (
                              <option key={role} value={role}>{tRole(role)}</option>
                            ))}
                          </select>
                        </div>
                        <WorkStatusField
                          value={formData.work_status}
                          onChange={(next) => setFormData((prev) => ({ ...prev, work_status: next }))}
                        />
                      </div>

                      {/* Bio */}
                      <div>
                        <label htmlFor="bio" className="block text-sm font-medium text-gray-900 mb-1.5">
                          {t('bio')}
                        </label>
                        <textarea
                          id="bio"
                          name="bio"
                          value={formData.bio}
                          onChange={handleChange}
                          maxLength={500}
                          rows={5}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 resize-y transition"
                          placeholder={t('bioPlaceholder')}
                        />
                        <p className="mt-1 text-xs text-gray-400 text-right">{formData.bio.length}/500</p>
                      </div>

                      {/* Avatar */}
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1.5">
                          {t('avatar.label')}
                        </label>
                        <AvatarUploader
                          value={formData.avatar_url}
                          onChange={(url) => setFormData((prev) => ({ ...prev, avatar_url: url }))}
                        />
                      </div>

                      <LinksField links={links} onChange={setLinks} />

                      {/* Stays — city-level travel with day counts. Lives
                          above the country-level multi-select because most
                          users want to add city detail and the country list
                          still has value as a quick "I've been here" picker. */}
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1.5">
                          {tStays('editorTitle')}
                        </label>
                        <p className="mb-3 text-xs text-gray-500">{tStays('editorHint')}</p>
                        <StaysEditor stays={stays} onChange={setStays} />
                      </div>

                      {/* Visited countries */}
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1.5">
                          {t('visitedCountries')}
                        </label>
                        <CountrySelector
                          selectedCountries={visitedCountries}
                          onChange={setVisitedCountries}
                        />
                        <p className="mt-1.5 text-xs text-gray-500">
                          {t('visitedCountriesHint')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit */}
                <div className="pt-4 sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent pb-4 -mx-4 sm:-mx-6 px-4 sm:px-6">
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="w-full bg-gray-900 text-white px-6 py-4 rounded-full font-medium hover:bg-gray-800 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[52px]"
                  >
                    {loading ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span>{isEdit ? t('editSubmitting') : t('submitting')}</span>
                      </>
                    ) : (
                      <>
                        <span>{isEdit ? t('editSubmit') : t('submit')}</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </>
                    )}
                  </button>
                  {!isEdit && (
                    <p className="mt-3 text-center text-xs text-gray-500">
                      {t('submitNote')}
                    </p>
                  )}
                </div>
              </form>
            </div>

            {/* Live preview — sticky on lg+. Hidden on small screens to
                keep the form full-width; mobile users see their card on
                save. The container itself owns the panel chrome so the
                preview component can stay focused on rendering the card. */}
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-3">
                  {isPreviewEmpty(deferredFormData) ? t('previewExampleLabel') : t('previewLabel')}
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  {/* Theme isn't part of this form (lives in /settings as
                      profile_settings.theme_color), so the preview always
                      uses the default. Users can switch themes from /settings
                      and visit /{handle} to see the themed version. */}
                  <LiveCardPreview
                    form={deferredFormData}
                    links={deferredLinks}
                    stays={deferredStays}
                    visitedCountries={deferredVisitedCountries}
                    themeKey="classic"
                  />
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </>
  )
}
