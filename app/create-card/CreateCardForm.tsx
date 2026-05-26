'use client'

import React, { useEffect, useState, useDeferredValue } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/Toast'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { CountrySelector } from '@/components/CountrySelector'
import { AvatarUploader } from '@/components/AvatarUploader'
import { LiveCardPreview, isPreviewEmpty } from '@/components/LiveCardPreview'
import { StaysEditor } from '@/components/StaysEditor'
import { Logo } from '@/components/Logo'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ROLES, TIMEZONE_LIST } from './form-constants'
import {
  BlurbsField,
  CompletionMeter,
  HandleField,
  LinksField,
  WorkStatusField,
} from './form-sections'
import { useHandleCheck } from './useHandleCheck'
import { useFormDraft, type FormInitial } from './useFormDraft'
import { useSubmitCard } from './useSubmitCard'

// Server-injected snapshot. When non-null the form switches to edit mode:
// fields pre-populate, handle becomes read-only, submit hits PUT.
export type InitialCardData = FormInitial

export default function CreateCardForm({ initial }: { initial?: InitialCardData | null }) {
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
    draftHasOptionalData,
    clearDraft,
  } = useFormDraft(initial ?? null)

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
    isHandleAvailable: handleStatus === 'available',
    clearDraft,
    showError,
  })

  // Every keystroke triggers a full re-render of the embedded NomadCard
  // preview (and its WorldMap SVG). useDeferredValue lets React keep the
  // inputs responsive — the preview renders against a slightly stale
  // snapshot that catches up when the user pauses.
  const deferredFormData = useDeferredValue(formData)
  const deferredLinks = useDeferredValue(links)
  const deferredStays = useDeferredValue(stays)
  const deferredBlurbs = useDeferredValue(blurbs)
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

                      {/* Hire CTA — solid-accent button on the public card
                          (distinct from the bordered link rows below).
                          Both fields blank = section hidden. */}
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1.5">
                          {t('hireCta.title')}
                        </label>
                        <p className="mb-3 text-xs text-gray-500">{t('hireCta.description')}</p>
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
                      </div>

                      <BlurbsField blurbs={blurbs} onChange={setBlurbs} />

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
                    blurbs={deferredBlurbs}
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
