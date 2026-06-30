'use client'

import React, { useEffect, useMemo, useState, useDeferredValue } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/Toast'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { CountrySelector } from '@/components/CountrySelector'
import { CityAutocomplete } from '@/components/CityAutocomplete'
import { AvatarUploader } from '@/components/AvatarUploader'
import { LiveCardPreview, isPreviewEmpty } from '@/components/LiveCardPreview'
import { StaysEditor, type StayDraft } from '@/components/StaysEditor'
import { Logo } from '@/components/Logo'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ROLES, TIMEZONE_LIST } from './form-constants'
import {
  BlurbsField,
  CompletionMeter,
  FeaturedWorksField,
  HandleField,
  LinksField,
  WorkStatusField,
} from './form-sections'
import { useHandleCheck } from './useHandleCheck'
import { useFormDraft, type FormInitial } from './useFormDraft'
import { useSubmitCard } from './useSubmitCard'
import { useUnsavedChanges } from './useUnsavedChanges'
import type { BlurbDraft, FeaturedWorkDraft, NomadLinkDraft } from './form-constants'

// Canonical serialization of everything the form can edit. Built through one
// function for both the loaded baseline and the live state so key order +
// shape match exactly — otherwise pristine cards would read as "dirty" (e.g.
// an undefined label vs ''). Drives the unsaved-changes guard.
interface EditableState {
  handle: string
  display_name: string
  role: string
  bio: string
  current_city: string
  country: string
  work_status: string
  now_text: string
  avatar_url: string
  timezone: string
  nomad_since: string
  hire_cta_label: string
  hire_cta_url: string
  meetup_cta_label: string
  meetup_cta_url: string
  open_to_coffee: boolean
  availability: string
  visitedCountries: string[]
  links: NomadLinkDraft[]
  stays: StayDraft[]
  blurbs: BlurbDraft[]
  featuredWorks: FeaturedWorkDraft[]
}

function editableSnapshot(v: EditableState): string {
  return JSON.stringify({
    handle: v.handle,
    display_name: v.display_name,
    role: v.role,
    bio: v.bio,
    current_city: v.current_city,
    country: v.country,
    work_status: v.work_status,
    now_text: v.now_text,
    avatar_url: v.avatar_url,
    timezone: v.timezone,
    nomad_since: v.nomad_since,
    hire_cta_label: v.hire_cta_label,
    hire_cta_url: v.hire_cta_url,
    meetup_cta_label: v.meetup_cta_label,
    meetup_cta_url: v.meetup_cta_url,
    open_to_coffee: v.open_to_coffee,
    availability: v.availability,
    visitedCountries: v.visitedCountries,
    links: v.links.map((l) => ({ type: l.type, label: l.label || '', url: l.url })),
    stays: v.stays.map((s) => ({
      city: s.city,
      country: s.country,
      start_date: s.start_date,
      end_date: s.end_date || '',
      notes: s.notes || '',
      lat: s.lat ?? null,
      lon: s.lon ?? null,
      photo_urls: s.photo_urls || [],
    })),
    blurbs: v.blurbs.map((b) => ({ label: b.label, value: b.value })),
    featuredWorks: v.featuredWorks.map((w) => ({
      title: w.title,
      url: w.url,
      description: w.description || '',
    })),
  })
}

// Server-injected snapshot. When non-null the form switches to edit mode:
// fields pre-populate, handle becomes read-only, submit hits PUT.
export type InitialCardData = FormInitial

export default function CreateCardForm({
  initial,
  embedded = false,
  handleSuggestion,
}: {
  initial?: InitialCardData | null
  // When true, the form skips its own top nav + min-h-screen wrapper because
  // the host (e.g. /edit layout) already provides them. Keeps the form's
  // controls and live preview the same in both contexts.
  embedded?: boolean
  // Pre-fill for the handle input in create mode. Only used when the user
  // has no saved draft and no existing card row — the server derives this
  // from their auth email so a first-time visitor isn't staring at an
  // empty "pick a permanent URL" field with no starting point.
  handleSuggestion?: string
}) {
  const isEdit = Boolean(initial)
  const t = useTranslations('createCard')
  const tStays = useTranslations('stays')
  const tRole = useTranslations('roles')
  const { toasts, showError, removeToast } = useToast()

  const {
    formData,
    setFormData,
    visitedCountries,
    setVisitedCountries,
    links,
    setLinks,
    stays,
    setStays,
    blurbs,
    setBlurbs,
    featuredWorks,
    setFeaturedWorks,
    draftHasOptionalData,
    clearDraft,
  } = useFormDraft(initial ?? null, handleSuggestion)

  // Auto-expand the optional section when there's draft data in it, so users
  // don't lose visibility into in-progress work. Edit mode opens it by
  // default (the user already has data in there).
  const [showMore, setShowMore] = useState(isEdit)
  useEffect(() => {
    if (draftHasOptionalData) setShowMore(true)
  }, [draftHasOptionalData])

  const { status: handleStatus, error: handleError } = useHandleCheck(formData.handle, isEdit)

  const { loading, submit } = useSubmitCard({
    initial: initial ?? null,
    formData,
    visitedCountries,
    links,
    stays,
    blurbs,
    featuredWorks,
    isHandleAvailable: handleStatus === 'available',
    clearDraft,
    showError,
  })

  // Unsaved-changes guard — edit mode only (create mode already autosaves a
  // localStorage draft, so abandoning it loses nothing). Compares live state
  // against the snapshot the page loaded with; the guard is suppressed while a
  // save is in flight so the post-save redirect isn't intercepted.
  const baselineSnapshot = useMemo(
    () =>
      initial
        ? editableSnapshot({
            handle: initial.handle,
            display_name: initial.display_name,
            role: initial.role,
            bio: initial.bio,
            current_city: initial.current_city,
            country: initial.country,
            work_status: initial.work_status,
            now_text: initial.now_text,
            avatar_url: initial.avatar_url,
            timezone: initial.timezone,
            nomad_since: initial.nomad_since,
            hire_cta_label: initial.hire_cta_label,
            hire_cta_url: initial.hire_cta_url,
            meetup_cta_label: initial.meetup_cta_label,
            meetup_cta_url: initial.meetup_cta_url,
            open_to_coffee: initial.open_to_coffee,
            availability: initial.availability,
            visitedCountries: initial.visited_countries,
            links: initial.links,
            stays: initial.stays,
            blurbs: initial.blurbs,
            featuredWorks: initial.featured_works,
          })
        : null,
    [initial],
  )
  const liveSnapshot = editableSnapshot({
    ...formData,
    visitedCountries,
    links,
    stays,
    blurbs,
    featuredWorks,
  })
  const isDirty = isEdit && baselineSnapshot !== null && liveSnapshot !== baselineSnapshot
  useUnsavedChanges(isDirty && !loading, t('unsavedWarning'))

  // Every keystroke triggers a full re-render of the embedded NomadCard
  // preview (and its WorldMap SVG). useDeferredValue lets React keep the
  // inputs responsive — the preview renders against a slightly stale
  // snapshot that catches up when the user pauses.
  const deferredFormData = useDeferredValue(formData)
  const deferredLinks = useDeferredValue(links)
  const deferredStays = useDeferredValue(stays)
  const deferredBlurbs = useDeferredValue(blurbs)
  const deferredFeaturedWorks = useDeferredValue(featuredWorks)
  const deferredVisitedCountries = useDeferredValue(visitedCountries)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const canSubmit =
    !loading &&
    formData.handle.trim() &&
    handleStatus === 'available' &&
    formData.display_name.trim()

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className={embedded ? 'bg-white text-gray-900' : 'min-h-screen bg-white text-gray-900'}>
        {!embedded && (
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
        )}

        <main className={`max-w-6xl mx-auto px-4 sm:px-6 ${embedded ? 'py-6 sm:py-8' : 'py-10 sm:py-14'}`}>
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
                  // The now-line headline — nudged here in place of the old
                  // 'countries' item. Country-collection is the vanity axis we
                  // deliberately de-emphasised (CountrySelector cap + dropped
                  // explore sort), so the meter no longer gamifies it.
                  { key: 'now', filled: !!formData.now_text.trim() },
                  // nomad_since replaces the previous 'stays' nudge — a
                  // single month picker is a far gentler ask than logging
                  // city stays, and feeds the same "time on the road" stat.
                  { key: 'nomadSince', filled: !!formData.nomad_since },
                  { key: 'links', filled: links.some((l) => l.url.trim()) },
                ]}
              />

              <form onSubmit={submit} className="space-y-6">
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

                  {/* Avatar — the card's face. Promoted into the spine: a
                      profile with no photo is weak, so it shouldn't hide
                      behind "Customize more" the way it used to. */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">
                      {t('avatar.label')}
                    </label>
                    <AvatarUploader
                      value={formData.avatar_url}
                      onChange={(url) => setFormData((prev) => ({ ...prev, avatar_url: url }))}
                    />
                  </div>

                  {/* The "now" line — one sentence shown as the card's
                      headline, right under the name. The soul of nomad.now
                      captured as a single field; editing it re-freshens the
                      presence signal server-side. */}
                  <div>
                    <label htmlFor="now_text" className="block text-sm font-medium text-gray-900 mb-1.5">
                      {t('nowText')}
                    </label>
                    <input
                      type="text"
                      id="now_text"
                      name="now_text"
                      value={formData.now_text}
                      onChange={handleChange}
                      maxLength={140}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 transition text-base"
                      placeholder={t('nowTextPlaceholder')}
                    />
                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-xs text-gray-500">{t('nowTextHint')}</p>
                      <p className="text-xs text-gray-400 tabular-nums">{formData.now_text.length}/140</p>
                    </div>
                  </div>

                  {/* Current city — autocomplete so picking a suggestion
                      also fills country (ISO α-2). That country code drives
                      the flag emoji in the public card's location row, and
                      previously was never set because the field was a plain
                      <input type="text">. Manual typing still works; users
                      who skip the suggestion just won't get a flag. */}
                  <div>
                    <label htmlFor="current_city" className="block text-sm font-medium text-gray-900 mb-1.5">
                      {t('currentCity')}
                    </label>
                    <CityAutocomplete
                      value={formData.current_city}
                      placeholder={t('currentCityPlaceholder')}
                      onCityChange={(city) =>
                        // Manual typing can't be trusted to match the stored
                        // country code, so clear it — a missing flag beats the
                        // previous city's wrong flag. onSelect below re-sets
                        // the correct country when a suggestion is picked.
                        setFormData((prev) => ({ ...prev, current_city: city, country: '' }))
                      }
                      onSelect={(s) =>
                        setFormData((prev) => ({
                          ...prev,
                          current_city: s.city,
                          country: s.country,
                        }))
                      }
                    />
                    <p className="mt-1.5 text-xs text-gray-500">{t('currentCityHint')}</p>
                  </div>

                  {/* Links — the core of a bio-link page, so they live in the
                      always-visible spine rather than buried under "Customize
                      more" → Extras (where they used to sit, below blurbs and
                      featured works). timezone (auto-detected) and nomad_since
                      moved down into "Customize more" — they're refinements,
                      not the spine. */}
                  <LinksField links={links} onChange={setLinks} />
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
                    <div id="more-fields" className="mt-5 space-y-8 border-t border-gray-100 pt-6">
                      {/* About — bio/role/status/timezone. Card-rendering side
                          of the user's identity. Avatar moved up into the
                          always-visible spine (a card with no face is weak),
                          and timezone moved down here from Essentials — it
                          auto-detects, so it's a refinement, not a spine field. */}
                      <FormSubsection title={t('moreSection.about')}>
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

                        {/* Timezone — drives the live clock on the public card.
                            Auto-detected from the browser on first load, so most
                            users never touch it; kept here (not in the spine) as
                            an override for travelers who want their "home" zone. */}
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
                      </FormSubsection>

                      {/* Conversion — the freelancer wedge's headline:
                          Hire CTA + Meetup CTA + Open-to-coffee chip. All
                          three are about turning card views into
                          conversations. Hire / Meetup default-collapsed
                          when empty so an unfilled card doesn't waste 200px
                          of edit space; auto-expand when there's content. */}
                      <FormSubsection title={t('moreSection.conversion')}>
                        {/* Availability — the hireable "now" signal that leads
                            the conversion section (and pairs with the Hire
                            CTA below). Free of any city requirement; '' hides
                            the chip entirely. */}
                        <div>
                          <label htmlFor="availability" className="block text-sm font-medium text-gray-900 mb-1.5">
                            {t('availability.label')}
                          </label>
                          <select
                            id="availability"
                            name="availability"
                            value={formData.availability}
                            onChange={handleChange}
                            className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 transition bg-white text-base"
                          >
                            <option value="">{t('availability.unset')}</option>
                            <option value="open">{t('availability.open')}</option>
                            <option value="booked">{t('availability.booked')}</option>
                          </select>
                          <p className="mt-1.5 text-xs text-gray-500">{t('availability.hint')}</p>
                        </div>

                        <Collapsible
                          title={t('hireCta.title')}
                          summary={t('hireCta.description')}
                          defaultOpen={
                            !!formData.hire_cta_label.trim() ||
                            !!formData.hire_cta_url.trim()
                          }
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                              type="text"
                              name="hire_cta_label"
                              value={formData.hire_cta_label}
                              onChange={handleChange}
                              maxLength={30}
                              placeholder={t('hireCta.labelPlaceholder')}
                              aria-label={t('hireCta.labelInput')}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 transition text-base"
                            />
                            <input
                              type="text"
                              name="hire_cta_url"
                              value={formData.hire_cta_url}
                              onChange={handleChange}
                              maxLength={2048}
                              placeholder={t('hireCta.urlPlaceholder')}
                              aria-label={t('hireCta.urlInput')}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 transition text-base font-mono"
                            />
                          </div>
                          <p className="mt-1.5 text-xs text-gray-500">{t('hireCta.urlHint')}</p>
                        </Collapsible>

                        <Collapsible
                          title={t('meetupCta.title')}
                          summary={t('meetupCta.description')}
                          defaultOpen={
                            !!formData.meetup_cta_label.trim() ||
                            !!formData.meetup_cta_url.trim()
                          }
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                              type="text"
                              name="meetup_cta_label"
                              value={formData.meetup_cta_label}
                              onChange={handleChange}
                              maxLength={30}
                              placeholder={t('meetupCta.labelPlaceholder')}
                              aria-label={t('meetupCta.labelInput')}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 transition text-base"
                            />
                            <input
                              type="text"
                              name="meetup_cta_url"
                              value={formData.meetup_cta_url}
                              onChange={handleChange}
                              maxLength={2048}
                              placeholder={t('meetupCta.urlPlaceholder')}
                              aria-label={t('meetupCta.urlInput')}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 transition text-base font-mono"
                            />
                          </div>
                          <p className="mt-1.5 text-xs text-gray-500">{t('meetupCta.urlHint')}</p>
                        </Collapsible>

                        {/* Open-to-coffee — soft signal, independent of
                            meetup_cta. Chip on the card requires
                            current_city, so we surface an explicit warning
                            when the toggle is on but current_city is empty
                            (avoids the silent-fail of "I checked the box
                            but nothing showed up"). */}
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            name="open_to_coffee"
                            checked={formData.open_to_coffee}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, open_to_coffee: e.target.checked }))
                            }
                            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-2 focus:ring-gray-900/15"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900">
                              {t('openToCoffee.label')}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {formData.current_city
                                ? t('openToCoffee.hintWithCity', { city: formData.current_city })
                                : t('openToCoffee.hintNoCity')}
                            </div>
                            {formData.open_to_coffee && !formData.current_city.trim() && (
                              <div className="mt-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
                                {t('openToCoffee.warningNoCity')}
                              </div>
                            )}
                          </div>
                        </label>
                      </FormSubsection>

                      {/* Travel — nomad_since (the one-field "time on the road"
                          driver) leads, then dated Stays (the credible temporal
                          source for the map + stats), with the lightweight
                          country picker in a collapsed disclosure below. Mirrors
                          the card hierarchy after countries were de-emphasised
                          as the vanity axis. */}
                      <FormSubsection title={t('moreSection.travel')}>
                        {/* Nomading since — single month picker. Drives the
                            "X years on the road" stat. Moved here from
                            Essentials: it's a travel refinement, and skipping
                            it falls back to summing logged stays. */}
                        <div>
                          <label htmlFor="nomad_since" className="block text-sm font-medium text-gray-900 mb-1.5">
                            {t('nomadSinceLabel')}
                          </label>
                          <input
                            type="month"
                            id="nomad_since"
                            name="nomad_since"
                            value={formData.nomad_since}
                            onChange={handleChange}
                            min="2000-01"
                            max={new Date().toISOString().slice(0, 7)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 transition text-base bg-white"
                          />
                          <p className="mt-1.5 text-xs text-gray-500">{t('nomadSinceHint')}</p>
                        </div>

                        <CollapsibleStays
                          stays={stays}
                          setStays={setStays}
                          tStays={tStays}
                        />

                        {/* Capped at 30 — the uncapped 195-country picker
                            invited a "wall of flags" vanity metric. Collapsed
                            by default (open when the user already has some) so
                            the heavy flag grid no longer dominates; the dated
                            Stays above already fill the map (mergedVisitedCodes),
                            so there's no need to collect them all. */}
                        <Collapsible
                          title={t('visitedCountries')}
                          summary={t('visitedCountriesHint')}
                          defaultOpen={visitedCountries.length > 0}
                        >
                          <CountrySelector
                            selectedCountries={visitedCountries}
                            onChange={setVisitedCountries}
                            maxSelections={30}
                          />
                        </Collapsible>
                      </FormSubsection>

                      {/* Extras — content/portfolio enrichments. None of
                          these are required; the card just doesn't render
                          the corresponding section when empty. */}
                      <FormSubsection title={t('moreSection.extras')}>
                        <BlurbsField blurbs={blurbs} onChange={setBlurbs} />
                        <FeaturedWorksField works={featuredWorks} onChange={setFeaturedWorks} />
                      </FormSubsection>
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
                    blurbs={deferredBlurbs}
                    featuredWorks={deferredFeaturedWorks}
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

// Group header for the four sub-sections inside "Customize more"
// (About / Conversion / Travel / Extras). Quiet uppercase label so it
// reads as scaffolding, not as another piece of UI competing for
// attention with the inputs below it.
function FormSubsection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
        {title}
      </h4>
      <div className="space-y-5">{children}</div>
    </div>
  )
}

// Generic header-+-disclosure block. Used for Hire CTA, Meetup CTA, and
// the Stays editor. Default-open is parametric so each call site can
// auto-expand when there's already content (filled fields / saved rows)
// without ever auto-collapsing — losing sight of in-progress data would
// be worse than the cleaner empty state we get on first paint.
function Collapsible({
  title,
  summary,
  defaultOpen,
  children,
}: {
  title: string
  summary?: string
  defaultOpen: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  useEffect(() => {
    if (defaultOpen) setOpen(true)
  }, [defaultOpen])
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <div className="text-sm font-medium text-gray-900">{title}</div>
          {summary && (
            <div className="text-xs text-gray-500 mt-0.5">{summary}</div>
          )}
        </div>
        <svg
          className={`w-4 h-4 flex-shrink-0 text-gray-500 transition ${open ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-200">{children}</div>
      )}
    </div>
  )
}

// Stays-specific wrapper around Collapsible. Splits out so the call site
// in the Travel sub-section stays readable and the Stays-specific
// behavior (auto-open when there are existing stays) lives here.
function CollapsibleStays({
  stays,
  setStays,
  tStays,
}: {
  stays: StayDraft[]
  setStays: React.Dispatch<React.SetStateAction<StayDraft[]>>
  tStays: ReturnType<typeof useTranslations>
}) {
  return (
    <Collapsible
      title={`${tStays('editorTitle')} (${tStays('optional')})`}
      summary={tStays('collapsedHint')}
      defaultOpen={stays.length > 0}
    >
      <p className="mb-3 text-xs text-gray-500">{tStays('editorHint')}</p>
      <StaysEditor stays={stays} onChange={setStays} />
    </Collapsible>
  )
}
