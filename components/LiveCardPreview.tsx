'use client'

import { NomadCard } from './NomadCard'
import type { User, NomadLink, NomadStay, NomadBlurb, NomadFeaturedWork } from '@/types/database'

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
  avatar_url: string
  // Free-form: preset slugs render through i18n in NomadCard, custom strings
  // render verbatim. Empty hides the status pill entirely.
  work_status: string
  timezone: string
  // YYYY-MM (month-picker shape). The synthesised User below converts to
  // YYYY-MM-01 so the stats renderer can parse it the same way it parses
  // the saved DB value.
  nomad_since?: string
  // Hire CTA — both blank hides the section. The synthesised User below
  // carries them through to the section renderer.
  hire_cta_label?: string
  hire_cta_url?: string
  // Meetup CTA — twin of hire_cta. Both blank hides the section.
  meetup_cta_label?: string
  meetup_cta_url?: string
}

export interface PreviewStay {
  city: string
  country: string
  start_date: string
  end_date: string
  notes: string
  // Optional so callers with only the minimum shape (e.g. SAMPLE_STAYS below)
  // don't need to pass them. Both unlock real-card fidelity: lat/lon plot a
  // dot on the WorldMap, photo_urls light up the stays section.
  lat?: number | null
  lon?: number | null
  photo_urls?: string[]
}

export interface PreviewBlurb {
  label: string
  value: string
}

export interface PreviewFeaturedWork {
  title: string
  url: string
  description: string
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
    | 'spotify'
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
  avatar_url: '',
  work_status: 'freelancing',
  timezone: 'Asia/Bangkok',
  // ~3.4 years on the road — anchors the "years nomading" stat for the
  // example card so new visitors see what the stat strip looks like
  // populated. Computed from today so the example doesn't drift stale.
  nomad_since: (() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 3, d.getMonth() - 4, 1)
    return d.toISOString().slice(0, 7)
  })(),
  // Sample card shows both CTAs paired so new users see how the dual
  // primary/secondary conversion is meant to read.
  hire_cta_label: 'Hire me',
  hire_cta_url: 'mailto:kenji@example.com',
  meetup_cta_label: 'Grab a coffee in Bangkok',
  meetup_cta_url: 'https://cal.com/kenji/coffee',
}
const SAMPLE_LINKS: PreviewLink[] = [
  { type: 'instagram', url: 'https://instagram.com/kenji' },
  { type: 'linkedin', url: 'https://linkedin.com/in/kenji' },
  { type: 'website', url: 'https://kenji.example' },
]
const SAMPLE_VISITED = ['TH', 'JP', 'PT', 'VN', 'MY', 'ID', 'MX', 'ES', 'GE', 'RS']
const SAMPLE_BLURBS: PreviewBlurb[] = [
  { label: 'Now reading', value: 'The Creative Act — Rick Rubin' },
  { label: 'Booking', value: 'Q2 2026 onwards' },
  { label: 'Tools', value: 'Figma · Linear · Notion' },
  { label: 'Coffee', value: '☕️☕️☕️' },
]
const SAMPLE_FEATURED_WORKS: PreviewFeaturedWork[] = [
  {
    title: 'Stripe checkout redesign',
    url: 'https://kenji.example/work/stripe-checkout',
    description: 'Led the visual + interaction overhaul shipped to 1.2M merchants.',
  },
  {
    title: 'Linear → Notion data sync',
    url: 'https://kenji.example/work/linear-notion-sync',
    description: 'Open-source TS library bridging Linear cycles and Notion databases.',
  },
]
const SAMPLE_STAYS: PreviewStay[] = [
  { city: 'Bangkok', country: 'TH', start_date: dateNDaysAgo(14), end_date: '', notes: '' },
  { city: 'Lisbon', country: 'PT', start_date: dateNDaysAgo(60), end_date: dateNDaysAgo(28), notes: '' },
  { city: 'Mexico City', country: 'MX', start_date: dateNDaysAgo(120), end_date: dateNDaysAgo(70), notes: '' },
]
function dateNDaysAgo(n: number): string {
  const d = new Date(Date.now() - n * 86_400_000)
  return d.toISOString().slice(0, 10)
}

export function isPreviewEmpty(form: PreviewFormState): boolean {
  // display_name is the trigger because handle exists in edit mode but
  // display_name is the first content signal for new users.
  return !form.display_name.trim()
}

export function LiveCardPreview({
  form,
  links,
  stays,
  blurbs,
  featuredWorks,
  visitedCountries,
  themeKey,
}: {
  form: PreviewFormState
  links: PreviewLink[]
  stays: PreviewStay[]
  blurbs?: PreviewBlurb[]
  featuredWorks?: PreviewFeaturedWork[]
  visitedCountries: string[]
  themeKey?: string | null
}) {
  const empty = isPreviewEmpty(form)
  const effectiveForm = empty ? SAMPLE_FORM : form
  const effectiveLinks = empty ? SAMPLE_LINKS : links
  const effectiveStays = empty ? SAMPLE_STAYS : stays
  const effectiveBlurbs = empty ? SAMPLE_BLURBS : (blurbs ?? [])
  const effectiveFeaturedWorks = empty ? SAMPLE_FEATURED_WORKS : (featuredWorks ?? [])
  const effectiveCountries = empty ? SAMPLE_VISITED : visitedCountries

  const user: User = {
    id: 'preview',
    handle: effectiveForm.handle || 'yourhandle',
    display_name: effectiveForm.display_name || undefined,
    avatar_url: effectiveForm.avatar_url || undefined,
    bio: effectiveForm.bio || undefined,
    role: effectiveForm.role || undefined,
    current_city: effectiveForm.current_city || undefined,
    work_status: effectiveForm.work_status,
    timezone: effectiveForm.timezone || undefined,
    // Form is a month picker (YYYY-MM); the saved column is YYYY-MM-DD.
    // Append -01 so the live preview matches what the public card will
    // actually compute after save.
    nomad_since: effectiveForm.nomad_since ? `${effectiveForm.nomad_since}-01` : null,
    visited_countries: effectiveCountries,
    profile_type: 'nomad',
    hire_cta_label: effectiveForm.hire_cta_label || null,
    hire_cta_url: effectiveForm.hire_cta_url || null,
    meetup_cta_label: effectiveForm.meetup_cta_label || null,
    meetup_cta_url: effectiveForm.meetup_cta_url || null,
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

  const cardBlurbs: NomadBlurb[] = effectiveBlurbs
    .filter((b) => b.label.trim() && b.value.trim())
    .map((b, i) => ({
      id: `preview-blurb-${i}`,
      user_id: 'preview',
      label: b.label,
      value: b.value,
      order_index: i,
      created_at: NOW_ISO,
      updated_at: NOW_ISO,
    }))

  const cardFeaturedWorks: NomadFeaturedWork[] = effectiveFeaturedWorks
    .filter((w) => w.title.trim() && w.url.trim())
    .map((w, i) => ({
      id: `preview-work-${i}`,
      user_id: 'preview',
      title: w.title,
      url: w.url,
      description: w.description.trim() || null,
      order_index: i,
      created_at: NOW_ISO,
      updated_at: NOW_ISO,
    }))

  const cardStays: NomadStay[] = effectiveStays
    .filter((s) => s.city.trim() && s.country && s.start_date)
    .map((s, i) => ({
      id: `preview-stay-${i}`,
      user_id: 'preview',
      city: s.city,
      country: s.country,
      lat: s.lat ?? null,
      lon: s.lon ?? null,
      start_date: s.start_date,
      end_date: s.end_date || null,
      notes: s.notes || null,
      photo_urls: s.photo_urls ?? [],
      created_at: NOW_ISO,
      updated_at: NOW_ISO,
    }))

  return (
    <NomadCard
      user={user}
      links={cardLinks}
      stays={cardStays}
      blurbs={cardBlurbs}
      featuredWorks={cardFeaturedWorks}
      themeKey={themeKey}
      embedded
    />
  )
}
