'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { countries, getCountryFlag } from '@/lib/countries'
import { stayDayCount } from '@/lib/stays'
import { CityAutocomplete } from './CityAutocomplete'

// Form-side representation of a stay. Matches what gets POSTed to
// /api/stays — server fills in id/user_id/timestamps. `end_date` may be
// the empty string while the user is still entering data; the API treats
// '' the same as null (= currently here).
//
// lat/lon get populated when the user picks an autocomplete suggestion;
// stay null when they type a city manually (some small towns won't be in
// Nominatim, and that shouldn't block save).
export interface StayDraft {
  city: string
  country: string // ISO 3166-1 alpha-2
  lat: number | null
  lon: number | null
  start_date: string // YYYY-MM-DD
  end_date: string // '' = currently here
  notes: string
  // Public Supabase Storage URL once uploaded, empty string otherwise.
  // Kept as a string (not null) so React's controlled inputs stay happy.
  photo_url: string
}

export function emptyStay(): StayDraft {
  return {
    city: '',
    country: '',
    lat: null,
    lon: null,
    start_date: '',
    end_date: '',
    notes: '',
    photo_url: '',
  }
}

// Sorts countries by name for the picker. Sorted once at module load —
// the country list is static so this is essentially free.
const SORTED_COUNTRIES = [...countries].sort((a, b) => a.name.localeCompare(b.name))

interface StaysEditorProps {
  stays: StayDraft[]
  onChange: (stays: StayDraft[]) => void
}

const HARD_CAP = 50

export function StaysEditor({ stays, onChange }: StaysEditorProps) {
  const t = useTranslations('stays')
  // Per-stay upload state — keyed by the row index. Cleared on success or
  // failure. We do not block re-uploading while a previous one is in
  // flight because the form is generally one user clicking once at a
  // time, and the worst case is a wasted POST.
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)
  const [uploadErrorIdx, setUploadErrorIdx] = useState<number | null>(null)

  const update = (idx: number, patch: Partial<StayDraft>) => {
    onChange(stays.map((s, i) => (i === idx ? { ...s, ...patch } : s)))
  }
  const remove = (idx: number) => {
    onChange(stays.filter((_, i) => i !== idx))
  }
  const add = () => {
    if (stays.length >= HARD_CAP) return
    onChange([...stays, emptyStay()])
  }

  const uploadPhoto = async (idx: number, file: File) => {
    setUploadingIdx(idx)
    setUploadErrorIdx(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/stays/photo/upload', { method: 'POST', body: form })
      if (!res.ok) {
        setUploadErrorIdx(idx)
        return
      }
      const data = (await res.json()) as { url?: string }
      if (!data.url) {
        setUploadErrorIdx(idx)
        return
      }
      update(idx, { photo_url: data.url })
    } catch {
      setUploadErrorIdx(idx)
    } finally {
      setUploadingIdx((cur) => (cur === idx ? null : cur))
    }
  }

  return (
    <div className="space-y-3">
      {stays.length === 0 && (
        <p className="text-xs text-gray-500">{t('emptyHint')}</p>
      )}
      {stays.map((stay, idx) => {
        const days = stay.start_date ? stayDayCount(stay.start_date, stay.end_date || null) : 0
        const isCurrent = stay.start_date && !stay.end_date
        return (
          <div
            key={idx}
            className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 relative"
          >
            <button
              type="button"
              onClick={() => remove(idx)}
              className="absolute top-3 right-3 p-1 text-gray-400 hover:text-red-600 transition"
              aria-label={t('remove')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-2">
              <CityAutocomplete
                value={stay.city}
                placeholder={t('cityPlaceholder')}
                onCityChange={(city) => update(idx, { city })}
                // Picking a suggestion fills city + country + coords as
                // one atomic update. The country <select> below still
                // shows the picked country, and lat/lon get carried
                // through so the WorldMap can plot per-city dots later.
                onSelect={(s) =>
                  update(idx, {
                    city: s.city,
                    country: s.country,
                    lat: s.lat,
                    lon: s.lon,
                  })
                }
              />
              <select
                value={stay.country}
                onChange={(e) => update(idx, { country: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 bg-white text-sm"
              >
                <option value="">{t('countryPick')}</option>
                {SORTED_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {getCountryFlag(c.code)} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="text-xs text-gray-600">
                <span className="block mb-1">{t('startDate')}</span>
                <input
                  type="date"
                  value={stay.start_date}
                  onChange={(e) => update(idx, { start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 text-sm"
                />
              </label>
              <label className="text-xs text-gray-600">
                <span className="block mb-1">
                  {t('endDate')}{' '}
                  <span className="text-gray-400 font-normal">{t('endDateHint')}</span>
                </span>
                <input
                  type="date"
                  value={stay.end_date}
                  onChange={(e) => update(idx, { end_date: e.target.value })}
                  min={stay.start_date || undefined}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 text-sm"
                />
              </label>
            </div>

            <input
              type="text"
              placeholder={t('notesPlaceholder')}
              value={stay.notes}
              onChange={(e) => update(idx, { notes: e.target.value })}
              maxLength={280}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 text-sm"
            />

            <div className="flex items-center gap-3">
              {stay.photo_url ? (
                <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={stay.photo_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => update(idx, { photo_url: '' })}
                    aria-label={t('photoRemove')}
                    className="absolute top-1 right-1 bg-white/90 hover:bg-white rounded-full w-5 h-5 flex items-center justify-center shadow text-gray-700"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <label className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 flex items-center justify-center cursor-pointer transition shrink-0 text-gray-400 hover:text-gray-600">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) uploadPhoto(idx, f)
                      // Reset so picking the same file again re-fires onChange.
                      e.target.value = ''
                    }}
                  />
                  {uploadingIdx === idx ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v3m6.364 1.636l-2.121 2.121M20 12h-3m-1.636 6.364l-2.121-2.121M12 17v3m-6.364-1.636l2.121-2.121M4 12h3m1.636-6.364l2.121 2.121" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                </label>
              )}
              <div className="text-xs text-gray-500 flex-1">
                {stay.photo_url ? t('photoHint') : t('photoEmptyHint')}
                {uploadErrorIdx === idx && (
                  <p className="text-red-600 mt-1">{t('photoError')}</p>
                )}
              </div>
            </div>

            {days > 0 && (
              <p className="text-xs text-gray-500">
                {isCurrent ? t('currentDuration', { days }) : t('pastDuration', { days })}
              </p>
            )}
          </div>
        )
      })}
      {stays.length < HARD_CAP && (
        <button
          type="button"
          onClick={add}
          className="text-sm text-gray-600 hover:text-gray-900 font-medium transition"
        >
          {t('addStay')}
        </button>
      )}
    </div>
  )
}
