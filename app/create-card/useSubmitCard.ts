'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { StayDraft } from '@/components/StaysEditor'
import { BLURB_CAP, LINK_CAP, type BlurbDraft, type NomadLinkDraft } from './form-constants'
import type { FormData, FormInitial } from './useFormDraft'

interface UseSubmitCardArgs {
  initial: FormInitial | null
  formData: FormData
  visitedCountries: string[]
  links: NomadLinkDraft[]
  stays: StayDraft[]
  blurbs: BlurbDraft[]
  // Returns true iff the handle is in a submit-eligible state. Computed
  // outside the hook because useHandleCheck owns that status.
  isHandleAvailable: boolean
  clearDraft: () => void
  // Wired up to the toast system on the page. Hook stays untoasted itself.
  showError: (message: string) => void
}

interface UseSubmitCardResult {
  loading: boolean
  submit: (e: React.FormEvent) => Promise<void>
}

// Orchestrates the three-step save: user upsert, links replace-all, stays
// replace-all. Sequential by design — links and stays reference the user
// row via user_id, and in create mode the row doesn't exist until the
// first call returns. The redirect target differs by mode:
//   - Edit: back to /{handle}, no celebration
//   - Create + paid: /{handle}?celebrate=1 so the celebration banner shows
//   - Create + unpaid: /pricing?from=create (paywall before the public card
//     goes live)
export function useSubmitCard({
  initial,
  formData,
  visitedCountries,
  links,
  stays,
  blurbs,
  isHandleAvailable,
  clearDraft,
  showError,
}: UseSubmitCardArgs): UseSubmitCardResult {
  const t = useTranslations('createCard')
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const isEdit = Boolean(initial)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.handle.trim() || !isHandleAvailable) {
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
        // Use null (not undefined) so cleanData on the server keeps the
        // value and clears the column — undefined would be filtered out
        // and the old DB value would persist.
        hire_cta_label: formData.hire_cta_label.trim() || null,
        hire_cta_url: formData.hire_cta_url.trim() || null,
      }

      const response = await fetch('/api/users', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isEdit ? baseBody : { ...baseBody, handle: formData.handle.trim().toLowerCase() },
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

      // Blurbs sync: replace-all in both modes. Skip in create mode when
      // there's nothing to insert (matches the stays branch below).
      const validBlurbs = blurbs.filter((b) => b.label.trim() && b.value.trim())
      if (validBlurbs.length > BLURB_CAP) {
        showError(t('errorTooManyBlurbs', { cap: BLURB_CAP }))
        setLoading(false)
        return
      }
      if (isEdit || validBlurbs.length > 0) {
        const blurbsResponse = await fetch('/api/blurbs', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blurbs: validBlurbs.map((b) => ({
              label: b.label.trim(),
              value: b.value.trim(),
            })),
          }),
        })
        if (!blurbsResponse.ok) {
          const blurbsData = await blurbsResponse.json().catch(() => ({}))
          throw new Error(blurbsData.error || t('errorGeneric'))
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

  return { loading, submit }
}
