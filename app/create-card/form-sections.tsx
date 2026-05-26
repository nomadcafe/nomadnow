'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import {
  BLURB_CAP,
  FEATURED_WORK_CAP,
  LINK_CAP,
  LINK_TYPE_SLUGS,
  WORK_STATUS_PRESETS,
  type BlurbDraft,
  type FeaturedWorkDraft,
  type HandleStatus,
  type NomadLinkDraft,
} from './form-constants'

// Sub-components for the create-card form. Lives next to CreateCardForm
// rather than under /components because none of these are reusable outside
// this one screen — they take very form-shaped props.

// Handle input with the inline availability status indicator (spinner /
// checkmark / X). Locked to a read-only display in edit mode since renaming
// is a separate flow (30-day cooldown — see ROADMAP).
export function HandleField({
  value,
  onChange,
  status,
  error,
  isEdit,
}: {
  value: string
  onChange: (next: string) => void
  status: HandleStatus
  error: string
  isEdit: boolean
}) {
  const t = useTranslations('createCard')

  return (
    <div>
      <label htmlFor="handle" className="block text-sm font-medium text-gray-900 mb-1.5">
        {t('handle')} {!isEdit && <span className="text-gray-400">*</span>}
      </label>
      {isEdit ? (
        <div className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 font-mono text-sm text-gray-600 flex items-center gap-1">
          <span className="text-gray-400">{t('handlePrefix')}</span>
          <span>{value}</span>
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
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required
            pattern="^[a-zA-Z0-9_-]+$"
            maxLength={50}
            autoFocus
            className={`w-full pl-[6.25rem] pr-10 py-3 border rounded-xl focus:outline-none focus:ring-2 font-mono text-sm bg-white transition ${
              status === 'available'
                ? 'border-green-500 focus:ring-green-500/30'
                : status === 'unavailable' || status === 'invalid'
                ? 'border-red-500 focus:ring-red-500/30'
                : 'border-gray-300 focus:ring-gray-900/15 focus:border-gray-900'
            }`}
            placeholder={t('handlePlaceholder')}
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {status === 'checking' && <LoadingSpinner size="sm" />}
            {status === 'available' && (
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {(status === 'unavailable' || status === 'invalid') && (
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
        </div>
      )}
      {isEdit ? (
        <p className="mt-1.5 text-xs text-gray-500">{t('handleLocked')}</p>
      ) : status === 'available' ? (
        <p className="mt-1.5 text-xs text-green-600">{t('handleAvailable')}</p>
      ) : status === 'unavailable' || status === 'invalid' ? (
        <p className="mt-1.5 text-xs text-red-600">{error || t('handleError')}</p>
      ) : (
        <p className="mt-1.5 text-xs text-gray-500">{t('handleHint')}</p>
      )}
    </div>
  )
}

// Work-status picker. Preset slugs come from WORK_STATUS_PRESETS; "Custom…"
// reveals a free-form text input that persists arbitrary strings up to 60
// chars. Owns customMode locally — nothing outside this field cares whether
// the value came from a preset or a custom string.
export function WorkStatusField({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}) {
  const t = useTranslations('createCard')
  const tStatus = useTranslations('card.workStatus')
  const [customMode, setCustomMode] = useState<boolean>(
    Boolean(value) && !(WORK_STATUS_PRESETS as readonly string[]).includes(value),
  )

  return (
    <div>
      <label htmlFor="work_status" className="block text-sm font-medium text-gray-900 mb-1.5">
        {t('status')}
      </label>
      <select
        id="work_status_select"
        value={
          customMode
            ? 'custom'
            : (WORK_STATUS_PRESETS as readonly string[]).includes(value)
            ? value
            : ''
        }
        onChange={(e) => {
          const v = e.target.value
          if (v === 'custom') {
            setCustomMode(true)
            // Clear any preset value so the text input starts empty.
            if ((WORK_STATUS_PRESETS as readonly string[]).includes(value)) {
              onChange('')
            }
          } else {
            setCustomMode(false)
            onChange(v)
          }
        }}
        className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 transition bg-white text-base"
      >
        <option value="">{t('statusNone')}</option>
        {WORK_STATUS_PRESETS.map((status) => (
          <option key={status} value={status}>{tStatus(status)}</option>
        ))}
        <option value="custom">{t('statusCustom')}</option>
      </select>
      {customMode && (
        <input
          type="text"
          id="work_status"
          name="work_status"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={60}
          placeholder={t('statusCustomPlaceholder')}
          className="mt-2 w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 transition text-base"
        />
      )}
    </div>
  )
}

// Repeating list of nomad-link rows. Each row is type select + URL input,
// plus an optional custom-label input when type === 'other'. Owns add /
// remove / per-row update internally.
export function LinksField({
  links,
  onChange,
}: {
  links: NomadLinkDraft[]
  onChange: (next: NomadLinkDraft[]) => void
}) {
  const t = useTranslations('createCard')
  const tLinkType = useTranslations('card.linkTypes')

  const updateRow = (index: number, field: keyof NomadLinkDraft, value: string) => {
    const next = [...links]
    next[index] = { ...next[index], [field]: value }
    onChange(next)
  }
  const addRow = () => {
    if (links.length < LINK_CAP) {
      onChange([...links, { type: 'website', url: '' }])
    }
  }
  const removeRow = (index: number) => {
    onChange(links.filter((_, i) => i !== index))
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-900 mb-1.5">
        {t('linksLabel')}
      </label>
      <div className="space-y-2">
        {links.map((link, index) => (
          <div key={index} className="flex gap-2">
            <select
              value={link.type}
              onChange={(e) => updateRow(index, 'type', e.target.value)}
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
                onChange={(e) => updateRow(index, 'label', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 flex-1"
              />
            )}
            <input
              type="url"
              placeholder={t('linkUrlPlaceholder')}
              value={link.url}
              onChange={(e) => updateRow(index, 'url', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 flex-1"
            />
            <button
              type="button"
              onClick={() => removeRow(index)}
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
            onClick={addRow}
            className="text-sm text-gray-600 hover:text-gray-900 font-medium transition"
          >
            {t('addLink')}
          </button>
        )}
      </div>
    </div>
  )
}

// Repeating list of label/value pairs that render as the "blurbs" section
// on the public card (Now reading / Booking / Rate / Tools / etc).
// Same add/remove/update shape as LinksField; capped at BLURB_CAP so the
// editorial-side section can't drown the card.
export function BlurbsField({
  blurbs,
  onChange,
}: {
  blurbs: BlurbDraft[]
  onChange: (next: BlurbDraft[]) => void
}) {
  const t = useTranslations('createCard.blurbs')

  const updateRow = (index: number, field: keyof BlurbDraft, value: string) => {
    const next = [...blurbs]
    next[index] = { ...next[index], [field]: value }
    onChange(next)
  }
  const addRow = () => {
    if (blurbs.length < BLURB_CAP) {
      onChange([...blurbs, { label: '', value: '' }])
    }
  }
  const removeRow = (index: number) => {
    onChange(blurbs.filter((_, i) => i !== index))
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-900 mb-1.5">
        {t('title')}
      </label>
      <p className="mb-3 text-xs text-gray-500">{t('description')}</p>
      <div className="space-y-2">
        {blurbs.map((blurb, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              maxLength={30}
              placeholder={t('labelPlaceholder')}
              value={blurb.label}
              onChange={(e) => updateRow(index, 'label', e.target.value)}
              className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900"
            />
            <input
              type="text"
              maxLength={120}
              placeholder={t('valuePlaceholder')}
              value={blurb.value}
              onChange={(e) => updateRow(index, 'value', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900"
            />
            <button
              type="button"
              onClick={() => removeRow(index)}
              className="px-2 py-2 text-gray-400 hover:text-red-600 transition"
              aria-label={t('remove')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
        {blurbs.length < BLURB_CAP && (
          <button
            type="button"
            onClick={addRow}
            className="text-sm text-gray-600 hover:text-gray-900 font-medium transition"
          >
            {t('add')}
          </button>
        )}
      </div>
    </div>
  )
}

// Repeating list of project tiles (title + url + optional description) that
// render as the "Featured Work" section on the public card — case studies
// and portfolio pieces for the freelancer wedge. Same add/remove/update
// shape as BlurbsField; capped at FEATURED_WORK_CAP (6, matches GitHub
// Pinned).
export function FeaturedWorksField({
  works,
  onChange,
}: {
  works: FeaturedWorkDraft[]
  onChange: (next: FeaturedWorkDraft[]) => void
}) {
  const t = useTranslations('createCard.featuredWork')

  const updateRow = (index: number, field: keyof FeaturedWorkDraft, value: string) => {
    const next = [...works]
    next[index] = { ...next[index], [field]: value }
    onChange(next)
  }
  const addRow = () => {
    if (works.length < FEATURED_WORK_CAP) {
      onChange([...works, { title: '', url: '', description: '' }])
    }
  }
  const removeRow = (index: number) => {
    onChange(works.filter((_, i) => i !== index))
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-900 mb-1.5">
        {t('title')}
      </label>
      <p className="mb-3 text-xs text-gray-500">{t('description')}</p>
      <div className="space-y-3">
        {works.map((work, index) => (
          <div
            key={index}
            className="border border-gray-200 rounded-xl p-3 space-y-2 bg-gray-50/40"
          >
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={80}
                placeholder={t('titlePlaceholder')}
                value={work.title}
                onChange={(e) => updateRow(index, 'title', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 bg-white"
              />
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="px-2 py-2 text-gray-400 hover:text-red-600 transition"
                aria-label={t('remove')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <input
              type="url"
              maxLength={2048}
              placeholder={t('urlPlaceholder')}
              value={work.url}
              onChange={(e) => updateRow(index, 'url', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 bg-white font-mono text-sm"
            />
            <input
              type="text"
              maxLength={140}
              placeholder={t('descPlaceholder')}
              value={work.description}
              onChange={(e) => updateRow(index, 'description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 bg-white"
            />
          </div>
        ))}
        {works.length < FEATURED_WORK_CAP && (
          <button
            type="button"
            onClick={addRow}
            className="text-sm text-gray-600 hover:text-gray-900 font-medium transition"
          >
            {t('add')}
          </button>
        )}
      </div>
    </div>
  )
}

// Progress bar + "next field to fill" prompt. Gamifies filling out the form
// by giving users a visible target — empirically a strong nudge for
// completion rate.
export type CompletionItem = { key: string; filled: boolean }

export function CompletionMeter({ items }: { items: CompletionItem[] }) {
  const t = useTranslations('createCard.completion')
  const filled = items.filter((i) => i.filled).length
  const total = items.length
  const next = items.find((i) => !i.filled)
  const pct = Math.round((filled / total) * 100)

  return (
    <div className="mb-8 rounded-xl border border-gray-200 bg-gray-50/60 p-4">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-sm font-medium text-gray-900">{t('title')}</span>
        <span className="text-sm font-mono tabular-nums text-gray-600">
          {filled}/{total}
        </span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gray-900 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-gray-500">
        {next ? t('next', { item: t(`items.${next.key}`) }) : t('complete')}
      </p>
    </div>
  )
}
