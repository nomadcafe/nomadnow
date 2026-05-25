'use client'

import { NomadCard } from './NomadCard'
import type { User, NomadLink } from '@/types/database'

// Live preview wrapper for /create-card. Takes the in-progress form values,
// synthesises a User + NomadLink set, and feeds them to NomadCard in embedded
// mode (no full-screen wrapper, no floating CTAs).
//
// Form fields are partial by nature — we coerce missing pieces to safe
// defaults so the card always renders something rather than blanking out
// half the layout while the user types.
export interface PreviewFormState {
  handle: string
  display_name: string
  role: string
  bio: string
  current_city: string
  hometown: string
  avatar_url: string
  work_status: 'available' | 'busy' | 'fulltime' | 'freelancing'
  timezone: string
}

export interface PreviewLink {
  type:
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
  label?: string
  url: string
}

const NOW_ISO = new Date().toISOString()

// Sample card shown when the form is essentially blank. Gives new users an
// immediate "this is what's possible" picture instead of a near-empty card
// they'd have to fill out before seeing any value. The moment the user
// types their name (or arrives in edit mode with one), the preview
// switches to their real data.
const SAMPLE_FORM: PreviewFormState = {
  handle: 'kenji',
  display_name: 'Kenji Tanaka',
  role: 'Product Designer',
  bio: 'Designing tools for the new remote.\nBased between Bangkok, Lisbon, and Mexico City.',
  current_city: 'Bangkok',
  hometown: 'Osaka',
  avatar_url: '',
  work_status: 'available',
  timezone: 'Asia/Bangkok',
}
const SAMPLE_LINKS: PreviewLink[] = [
  { type: 'instagram', url: 'https://instagram.com/kenji' },
  { type: 'linkedin', url: 'https://linkedin.com/in/kenji' },
  { type: 'website', url: 'https://kenji.example' },
]
const SAMPLE_VISITED = ['TH', 'JP', 'PT', 'VN', 'MY', 'ID', 'MX', 'ES', 'GE', 'RS']

export function isPreviewEmpty(form: PreviewFormState): boolean {
  // display_name is the trigger because handle exists in edit mode but
  // display_name is the first content signal for new users.
  return !form.display_name.trim()
}

export function LiveCardPreview({
  form,
  links,
  visitedCountries,
  themeKey,
}: {
  form: PreviewFormState
  links: PreviewLink[]
  visitedCountries: string[]
  themeKey?: string | null
}) {
  const empty = isPreviewEmpty(form)
  const effectiveForm = empty ? SAMPLE_FORM : form
  const effectiveLinks = empty ? SAMPLE_LINKS : links
  const effectiveCountries = empty ? SAMPLE_VISITED : visitedCountries

  const user: User = {
    id: 'preview',
    handle: effectiveForm.handle || 'yourhandle',
    display_name: effectiveForm.display_name || undefined,
    avatar_url: effectiveForm.avatar_url || undefined,
    bio: effectiveForm.bio || undefined,
    role: effectiveForm.role || undefined,
    hometown: effectiveForm.hometown || undefined,
    current_city: effectiveForm.current_city || undefined,
    work_status: effectiveForm.work_status,
    timezone: effectiveForm.timezone || undefined,
    visited_countries: effectiveCountries,
    profile_type: 'nomad',
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  }

  const cardLinks: NomadLink[] = effectiveLinks
    .filter((l) => l.url.trim())
    .map((l, i) => ({
      id: `preview-${i}`,
      user_id: 'preview',
      type: l.type,
      label: l.label,
      url: l.url,
      order_index: i,
      created_at: NOW_ISO,
      updated_at: NOW_ISO,
    }))

  return (
    <NomadCard
      user={user}
      links={cardLinks}
      themeKey={themeKey}
      embedded
    />
  )
}
