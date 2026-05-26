export type HandleStatus = 'idle' | 'checking' | 'available' | 'unavailable' | 'invalid'

export type LinkType =
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

// Slug-only; labels resolve through i18n at render time. Order matches the
// dropdown — Website first since it's the most common.
export const LINK_TYPE_SLUGS: LinkType[] = [
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
  'spotify',
  'other',
]

export interface NomadLinkDraft {
  type: LinkType
  label?: string
  url: string
}

// Label/value pair edited in the form. Mirrors the server-side schema in
// /api/blurbs (label <=30, value <=120) and the DB CHECK constraints in
// migration 0017. Up to BLURB_CAP rows kept the card from drowning in
// trivia — same shape as LINK_CAP for the links list.
export interface BlurbDraft {
  label: string
  value: string
}

export const BLURB_CAP = 8

// Click-through project tile edited in the form. Mirrors /api/featured-works
// (title <=80, url http/https <=2048, description <=140) and DB CHECKs in
// migration 0018. Cap of 6 matches GitHub Pinned — enough to make a case
// without drowning the card.
export interface FeaturedWorkDraft {
  title: string
  url: string
  description: string
}

export const FEATURED_WORK_CAP = 6

// Roles persist as their English label (canonical DB value). Translation
// happens at display time via the `roles.*` namespace.
export const ROLES = [
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

// Active presets offered in the form. 'available' was retired — old cards
// that still have it render as "no status" via REMOVED_STATUS_KEYS in
// NomadCard. Users can pick a preset or type their own via the "Custom…"
// option (any string up to 60 chars is accepted server-side).
export const WORK_STATUS_PRESETS = ['freelancing', 'busy', 'fulltime'] as const

// Soft cap to prevent abuse / accidental thousands; both plans treat links
// as unlimited in practice. The Zod schema on the API matches this number
// so the form and the backend agree on what's acceptable.
export const LINK_CAP = 50

export const DRAFT_STORAGE_KEY = 'nomad-card-draft'

// Computed once per module load — the timezone <select> renders ~400 options
// and a per-render IIFE call would recompute on every keystroke.
// Intl.supportedValuesOf is supported in all modern browsers + Node 18+;
// Safari < 16 throws, so we fall back to a curated nomad-friendly list.
export const TIMEZONE_LIST: string[] = (() => {
  try {
    return Intl.supportedValuesOf('timeZone')
  } catch {
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
})()

export function detectBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}
