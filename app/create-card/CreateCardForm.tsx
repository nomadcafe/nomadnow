'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/Toast'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { CountrySelector } from '@/components/CountrySelector'
import { AvatarUploader } from '@/components/AvatarUploader'
import { Logo } from '@/components/Logo'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { debounce } from '@/lib/debounce'

type HandleStatus = 'idle' | 'checking' | 'available' | 'unavailable' | 'invalid'
type LinkType =
  | 'website'
  | 'instagram'
  | 'twitter'
  | 'linkedin'
  | 'github'
  | 'youtube'
  | 'tiktok'
  | 'threads'
  | 'substack'
  | 'telegram'
  | 'other'

// Slug-only; labels resolve through i18n at render time. Order matches the
// dropdown — Website first since it's the most common.
const LINK_TYPE_SLUGS: LinkType[] = [
  'website',
  'instagram',
  'twitter',
  'linkedin',
  'github',
  'youtube',
  'tiktok',
  'threads',
  'substack',
  'telegram',
  'other',
]

interface NomadLink {
  type: LinkType
  label?: string
  url: string
}

// Server-injected snapshot. When non-null the form switches to edit mode:
// fields pre-populate, handle becomes read-only, submit hits PUT.
export interface InitialCardData {
  handle: string
  display_name: string
  role: string
  bio: string
  current_city: string
  hometown: string
  avatar_url: string
  work_status: 'available' | 'busy' | 'fulltime' | 'freelancing'
  timezone: string
  visited_countries: string[]
  links: NomadLink[]
}

// Cached at module scope so the dropdown doesn't recompute on every render.
// `Intl.supportedValuesOf` is supported in all modern browsers + Node 18+.
function getTimezoneList(): string[] {
  try {
    return Intl.supportedValuesOf('timeZone')
  } catch {
    // Safari < 16 doesn't ship the API. Fall back to a minimal nomad-friendly
    // list so the form still renders something pickable.
    return [
      'UTC',
      'America/Los_Angeles', 'America/New_York', 'America/Mexico_City',
      'America/Sao_Paulo', 'America/Buenos_Aires',
      'Europe/London', 'Europe/Lisbon', 'Europe/Berlin', 'Europe/Madrid',
      'Africa/Casablanca', 'Asia/Dubai', 'Asia/Bangkok', 'Asia/Singapore',
      'Asia/Tokyo', 'Asia/Seoul', 'Asia/Shanghai', 'Asia/Kolkata',
      'Australia/Sydney',
    ]
  }
}

function detectBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

// Roles persist as their English label (canonical DB value). Translation
// happens at display time via the `roles.*` namespace.
const ROLES = [
  'Designer',
  'Developer',
  'Writer',
  'Product Manager',
  'Marketer',
  'Consultant',
  'Entrepreneur',
  'Photographer',
  'Content Creator',
  'Other',
] as const

const WORK_STATUS_KEYS = ['available', 'freelancing', 'busy', 'fulltime'] as const

const STORAGE_KEY = 'nomad-card-draft'

export default function CreateCardForm({ initial }: { initial?: InitialCardData | null }) {
  const isEdit = Boolean(initial)
  const t = useTranslations('createCard')
  const tStatus = useTranslations('card.workStatus')
  const tRole = useTranslations('roles')
  const tLinkType = useTranslations('card.linkTypes')
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
      const saved = localStorage.getItem(STORAGE_KEY)
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
    hometown: initial?.hometown ?? savedDraft?.hometown ?? '',
    work_status: (initial?.work_status ?? savedDraft?.work_status ?? 'available') as 'available' | 'busy' | 'fulltime' | 'freelancing',
    avatar_url: initial?.avatar_url ?? savedDraft?.avatar_url ?? '',
    // Default: existing card → keep its value; new card → detect from browser
    // so the live local-time feature on the card works out of the box for
    // people who never touch the dropdown. Edit-mode users keep their saved
    // zone intact even if they're traveling.
    timezone: initial?.timezone ?? savedDraft?.timezone ?? '',
  })
  const [visitedCountries, setVisitedCountries] = useState<string[]>(
    initial?.visited_countries ?? savedDraft?.visitedCountries ?? [],
  )
  const [links, setLinks] = useState<NomadLink[]>(initial?.links ?? savedDraft?.links ?? [])

  // Auto-expand the optional section if the user has any saved draft data in it,
  // so they don't lose visibility into in-progress work.
  // Also: if the page was opened with ?handle=xxx (e.g. from the 404 "Claim this"
  // CTA), prefill that handle, overriding any saved draft so the intent is honored.
  useEffect(() => {
    if (
      savedDraft &&
      (savedDraft.role || savedDraft.bio || savedDraft.hometown ||
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
      const draft = { ...formData, visitedCountries, links }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
    } catch {
      // Ignore storage errors
    }
  }, [formData, visitedCountries, links, isEdit])

  const clearDraft = () => {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore
    }
  }

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

      setHandleStatus('checking')
      try {
        const response = await fetch(`/api/users/check-handle?handle=${encodeURIComponent(handle.toLowerCase())}`)
        const data = await response.json()

        if (data.available) {
          setHandleStatus('available')
          setHandleError('')
        } else {
          setHandleStatus('unavailable')
          setHandleError(t('handleTaken'))
        }
      } catch {
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

  const handleLinkChange = (index: number, field: keyof NomadLink, value: string) => {
    setLinks((prev) => {
      const newLinks = [...prev]
      newLinks[index] = { ...newLinks[index], [field]: value }
      return newLinks
    })
  }

  // Soft cap to prevent abuse / accidental thousands; both plans treat links
  // as unlimited in practice. The Zod schema on the API matches this number
  // so the form and the backend agree on what's acceptable.
  const LINK_CAP = 50

  const addLink = () => {
    if (links.length < LINK_CAP) {
      setLinks([...links, { type: 'website', url: '' }])
    }
  }

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index))
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
        hometown: formData.hometown || undefined,
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

      // Links sync: edit mode uses replace-all semantics (PUT) so removals
      // and reorders are handled in one round-trip. Create mode keeps the
      // per-link POST pattern for now.
      if (isEdit) {
        const replaceResponse = await fetch('/api/nomad-links', {
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
        if (!replaceResponse.ok) {
          const replaceData = await replaceResponse.json().catch(() => ({}))
          throw new Error(replaceData.error || t('errorGeneric'))
        }
      } else if (validLinks.length > 0) {
        await Promise.all(
          validLinks.map((link, index) =>
            fetch('/api/nomad-links', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: link.type,
                label: link.type === 'other' ? link.label : undefined,
                url: link.url,
                order_index: index,
              }),
            })
          )
        )
      }

      clearDraft()
      const handleSlug = (initial?.handle ?? formData.handle).trim().toLowerCase()
      // Edit mode: always return to the user's public card so they see the
      // change applied. Create mode: paid users go to their card, unpaid
      // users go to /pricing to subscribe.
      let nextPath: string
      if (isEdit) {
        nextPath = `/${handleSlug}`
      } else {
        const claimedPlan = data?.user?.plan as 'basic' | 'pro' | null | undefined
        nextPath = claimedPlan ? `/${handleSlug}` : '/pricing?from=create'
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
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
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

        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <header className="mb-8 sm:mb-10">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-2">
              {isEdit ? t('editTitle') : t('title')}
            </h1>
            <p className="text-gray-600">
              {isEdit ? t('editSubtitle') : t('subtitle')}
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Essentials */}
            <div className="space-y-5">
              {/* Handle */}
              <div>
                <label htmlFor="handle" className="block text-sm font-medium text-gray-900 mb-1.5">
                  {t('handle')} {!isEdit && <span className="text-gray-400">*</span>}
                </label>
                {isEdit ? (
                  // Locked, read-only display. Renaming requires a 30-day
                  // cooldown (see ROADMAP) so we don't expose it from this
                  // form — point users at support instead.
                  <div className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 font-mono text-sm text-gray-600 flex items-center gap-1">
                    <span className="text-gray-400">{t('handlePrefix')}</span>
                    <span>{formData.handle}</span>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-400 text-sm font-mono">{t('handlePrefix')}</span>
                    </div>
                    <input
                      type="text"
                      id="handle"
                      name="handle"
                      value={formData.handle}
                      onChange={handleChange}
                      required
                      pattern="^[a-zA-Z0-9_-]+$"
                      maxLength={50}
                      autoFocus
                      className={`w-full pl-[6.25rem] pr-10 py-3 border rounded-xl focus:outline-none focus:ring-2 font-mono text-sm bg-white transition ${
                        handleStatus === 'available'
                          ? 'border-green-500 focus:ring-green-500/30'
                          : handleStatus === 'unavailable' || handleStatus === 'invalid'
                          ? 'border-red-500 focus:ring-red-500/30'
                          : 'border-gray-300 focus:ring-gray-900/15 focus:border-gray-900'
                      }`}
                      placeholder={t('handlePlaceholder')}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      {handleStatus === 'checking' && <LoadingSpinner size="sm" />}
                      {handleStatus === 'available' && (
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {(handleStatus === 'unavailable' || handleStatus === 'invalid') && (
                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                  </div>
                )}
                {isEdit ? (
                  <p className="mt-1.5 text-xs text-gray-500">{t('handleLocked')}</p>
                ) : handleStatus === 'available' ? (
                  <p className="mt-1.5 text-xs text-green-600">{t('handleAvailable')}</p>
                ) : handleStatus === 'unavailable' || handleStatus === 'invalid' ? (
                  <p className="mt-1.5 text-xs text-red-600">{handleError || t('handleError')}</p>
                ) : (
                  <p className="mt-1.5 text-xs text-gray-500">{t('handleHint')}</p>
                )}
              </div>

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

              {/* Timezone — drives the live clock on the public card. Defaults
                  to the browser's detected zone so most users never have to
                  touch this; remains overrideable for travelers who want
                  their card to keep showing their "home" timezone. */}
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
                  {getTimezoneList().map((tz) => (
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
                    <div>
                      <label htmlFor="work_status" className="block text-sm font-medium text-gray-900 mb-1.5">
                        {t('status')}
                      </label>
                      <select
                        id="work_status"
                        name="work_status"
                        value={formData.work_status}
                        onChange={handleChange}
                        className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 transition bg-white text-base"
                      >
                        {WORK_STATUS_KEYS.map((status) => (
                          <option key={status} value={status}>{tStatus(status)}</option>
                        ))}
                      </select>
                    </div>
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

                  {/* Hometown */}
                  <div>
                    <label htmlFor="hometown" className="block text-sm font-medium text-gray-900 mb-1.5">
                      {t('hometown')}
                    </label>
                    <input
                      type="text"
                      id="hometown"
                      name="hometown"
                      value={formData.hometown}
                      onChange={handleChange}
                      maxLength={100}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 transition text-base"
                      placeholder={t('hometownPlaceholder')}
                    />
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

                  {/* Links */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">
                      {t('linksLabel')}
                    </label>
                    <div className="space-y-2">
                      {links.map((link, index) => (
                        <div key={index} className="flex gap-2">
                          <select
                            value={link.type}
                            onChange={(e) => handleLinkChange(index, 'type', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 bg-white"
                          >
                            {LINK_TYPE_SLUGS.map((slug) => (
                              <option key={slug} value={slug}>
                                {slug === 'other' ? t('linkTypeOther') : tLinkType(slug)}
                              </option>
                            ))}
                          </select>
                          {link.type === 'other' && (
                            <input
                              type="text"
                              placeholder={t('linkLabelPlaceholder')}
                              value={link.label || ''}
                              onChange={(e) => handleLinkChange(index, 'label', e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 flex-1"
                            />
                          )}
                          <input
                            type="url"
                            placeholder={t('linkUrlPlaceholder')}
                            value={link.url}
                            onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => removeLink(index)}
                            className="px-2 py-2 text-gray-400 hover:text-red-600 transition"
                            aria-label={t('removeLink')}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                      {links.length < LINK_CAP && (
                        <button
                          type="button"
                          onClick={addLink}
                          className="text-sm text-gray-600 hover:text-gray-900 font-medium transition"
                        >
                          {t('addLink')}
                        </button>
                      )}
                    </div>
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
        </main>
      </div>
    </>
  )
}
