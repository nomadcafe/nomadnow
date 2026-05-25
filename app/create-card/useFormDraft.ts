'use client'

import { useEffect, useState } from 'react'
import type { StayDraft } from '@/components/StaysEditor'
import {
  DRAFT_STORAGE_KEY,
  detectBrowserTimezone,
  type NomadLinkDraft,
} from './form-constants'

export interface FormData {
  handle: string
  display_name: string
  role: string
  bio: string
  current_city: string
  // Free-form string. Preset slugs (busy / freelancing / fulltime) get
  // their localised labels on the card; anything else renders verbatim.
  work_status: string
  avatar_url: string
  timezone: string
}

// Initial-state snapshot the server hands down in edit mode. In create mode
// this is null and the form falls through to (1) saved localStorage draft,
// (2) defaults.
export interface FormInitial {
  handle: string
  display_name: string
  role: string
  bio: string
  current_city: string
  avatar_url: string
  work_status: string
  timezone: string
  visited_countries: string[]
  links: NomadLinkDraft[]
  stays: StayDraft[]
}

interface UseFormDraftResult {
  formData: FormData
  setFormData: React.Dispatch<React.SetStateAction<FormData>>
  visitedCountries: string[]
  setVisitedCountries: React.Dispatch<React.SetStateAction<string[]>>
  links: NomadLinkDraft[]
  setLinks: React.Dispatch<React.SetStateAction<NomadLinkDraft[]>>
  stays: StayDraft[]
  setStays: React.Dispatch<React.SetStateAction<StayDraft[]>>
  // True if the saved localStorage draft contained any optional-section
  // data — the caller uses this to auto-expand the "Customize more" panel
  // so users don't lose visibility into in-progress work.
  draftHasOptionalData: boolean
  clearDraft: () => void
}

// Loads the synchronous draft snapshot from localStorage before render-time
// state initialisers run. Edit mode (initial != null) ignores any draft —
// it was captured during a previous create attempt and shouldn't bleed
// into an existing card.
function readDraft(isEdit: boolean) {
  if (isEdit || typeof window === 'undefined') return null
  try {
    const saved = localStorage.getItem(DRAFT_STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {
    // Ignore parse errors
  }
  return null
}

// Centralises the form state for /create-card. Three responsibilities:
//   1. Seed initial values from (in order) server `initial` → localStorage
//      draft → defaults. Includes a one-time `?handle=xxx` URL prefill so
//      404-page "Claim this" CTAs land the user with their handle pre-typed.
//   2. Persist the working draft to localStorage on every change in create
//      mode, so a refresh / crash doesn't lose typing. Edit mode skips.
//   3. Expose `clearDraft()` for the submit handler to call on success.
export function useFormDraft(initial: FormInitial | null): UseFormDraftResult {
  const isEdit = Boolean(initial)
  // Read once at hook setup so React's useState initializers can use it.
  // Reading inside the body is intentional — useState fires once anyway and
  // localStorage is a synchronous, cheap call.
  const draft = readDraft(isEdit)

  const [formData, setFormData] = useState<FormData>({
    handle: initial?.handle ?? draft?.handle ?? '',
    display_name: initial?.display_name ?? draft?.display_name ?? '',
    role: initial?.role ?? draft?.role ?? '',
    bio: initial?.bio ?? draft?.bio ?? '',
    current_city: initial?.current_city ?? draft?.current_city ?? '',
    work_status: initial?.work_status ?? draft?.work_status ?? '',
    avatar_url: initial?.avatar_url ?? draft?.avatar_url ?? '',
    // Defaults: edit mode → keep saved zone. New card → seed from browser
    // (the post-mount effect below) so the live local-time feature on the
    // public card works out of the box. We start blank here so the post-
    // mount detection can run; useState initialisers are render-time and
    // calling Intl during SSR would mismatch hydration.
    timezone: initial?.timezone ?? draft?.timezone ?? '',
  })
  const [visitedCountries, setVisitedCountries] = useState<string[]>(
    initial?.visited_countries ?? draft?.visitedCountries ?? [],
  )
  const [links, setLinks] = useState<NomadLinkDraft[]>(initial?.links ?? draft?.links ?? [])
  const [stays, setStays] = useState<StayDraft[]>(initial?.stays ?? draft?.stays ?? [])

  // One-shot post-mount work: handle URL prefill and timezone seeding. Runs
  // once because the array is empty — the ref-style guard against re-runs
  // is intentional (the deps would otherwise drag formData in and we'd loop).
  useEffect(() => {
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

  // Save the working draft to localStorage on every change in create mode.
  // Edit mode skips entirely — there's no value to capturing a draft of an
  // existing card, and we want a clean re-edit on the next visit.
  useEffect(() => {
    if (isEdit || typeof window === 'undefined') return
    try {
      const payload = { ...formData, visitedCountries, links, stays }
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload))
    } catch {
      // Ignore storage errors (quota, private mode, etc.)
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

  const draftHasOptionalData = Boolean(
    draft &&
      (draft.role ||
        draft.bio ||
        (draft.visitedCountries?.length ?? 0) > 0 ||
        (draft.links?.length ?? 0) > 0 ||
        draft.avatar_url),
  )

  return {
    formData,
    setFormData,
    visitedCountries,
    setVisitedCountries,
    links,
    setLinks,
    stays,
    setStays,
    draftHasOptionalData,
    clearDraft,
  }
}
