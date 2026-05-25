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
  const user: User = {
    id: 'preview',
    handle: form.handle || 'yourhandle',
    display_name: form.display_name || undefined,
    avatar_url: form.avatar_url || undefined,
    bio: form.bio || undefined,
    role: form.role || undefined,
    hometown: form.hometown || undefined,
    current_city: form.current_city || undefined,
    work_status: form.work_status,
    timezone: form.timezone || undefined,
    visited_countries: visitedCountries,
    profile_type: 'nomad',
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  }

  const cardLinks: NomadLink[] = links
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
