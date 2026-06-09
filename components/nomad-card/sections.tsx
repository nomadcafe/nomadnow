import React from 'react'
import type { User, NomadLink, NomadStay, NomadBlurb, NomadFeaturedWork } from '@/types/database'
import type { Theme, ButtonShapeClasses } from '@/lib/themes'
import { getCountryFlag, getCountryName } from '@/lib/countries'
import { stayDayCount, computeTravelStats, formatTimeOnTheRoad } from '@/lib/stays'
import { detectEmbed } from '@/lib/embeds'
import { WorldMap } from '../WorldMap'
import { LiveLocalTime } from './LiveLocalTime'
import { ConfirmPresenceButton } from './ConfirmPresenceButton'
import { CurrentStayPhotos } from './CurrentStayPhotos'
import { PastStayThumbnail } from './PastStayThumbnail'
import { ThemedAvatar } from './ThemedAvatar'

// Loose translator signature compatible with what next-intl returns from
// both useTranslations (client) and getTranslations (server). The value type
// matches next-intl's interpolation contract — strict per-namespace typing
// isn't worth it here since the renderers only ever touch a fixed set of keys.
export type Translator = (key: string, vars?: Record<string, string | number | Date>) => string

// Slugs we localise via `card.linkTypes.*`. DB still stores the slug
// (e.g. `twitter`) and we keep brand wordmarks identical across locales,
// so most labels resolve to a Latin-letter string anyway.
const LOCALISED_LINK_SLUGS = [
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
] as const

// Active preset slugs. Custom strings render verbatim — the form lets users
// write their own status. `available` was removed as a preset, so old cards
// that still have it stored fall through to REMOVED_STATUS_KEYS and don't
// render the pill at all.
const WORK_STATUS_KEYS = ['freelancing', 'busy', 'fulltime'] as const
const REMOVED_STATUS_KEYS = new Set(['available'])

// Brand colors for platforms with strong visual identities. Used to tint
// the icon chip on link rows so visitors can scan platforms at a glance.
// Monochrome-by-design platforms (X, GitHub, Threads, generic website/other)
// intentionally aren't in this map — they inherit the theme's text color so
// they stay legible on both light and dark cards.
export const LINK_BRAND_COLORS: Record<string, string> = {
  instagram: '#E1306C',
  linkedin: '#0A66C2',
  youtube: '#FF0000',
  tiktok: '#FE2C55',
  substack: '#FF6719',
  telegram: '#26A5E4',
  spotify: '#1DB954',
}

export const getLinkIcon = (type: string) => {
  switch (type) {
    case 'website':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" d="M3 12h18M12 3a13.5 13.5 0 010 18M12 3a13.5 13.5 0 000 18" />
        </svg>
      )
    case 'instagram':
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      )
    case 'linkedin':
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      )
    case 'twitter':
      // X (formerly Twitter). DB slug stays `twitter` for backward compat.
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      )
    case 'github':
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
        </svg>
      )
    case 'youtube':
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      )
    case 'tiktok':
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z" />
        </svg>
      )
    case 'threads':
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.74-1.757-.504-.586-1.284-.883-2.317-.89h-.031c-.83 0-1.954.229-2.67 1.295L9.74 7.123c.95-1.41 2.493-2.198 4.339-2.198h.043c3.087.02 4.925 1.91 5.107 5.205.105.044.211.092.316.142 1.49.7 2.578 1.768 3.13 3.115.642 1.91.4 4.298-1.456 6.118-1.838 1.81-4.054 2.564-7.04 2.564l-.005-.001zM11.83 13.46c-.225 0-.448.007-.665.022-1.838.108-2.984.95-2.92 2.143.066 1.244 1.434 1.821 2.748 1.752 1.275-.068 2.94-.566 3.22-3.86a10.46 10.46 0 0 0-2.382-.057z" />
        </svg>
      )
    case 'substack':
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z" />
        </svg>
      )
    case 'telegram':
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      )
    case 'spotify':
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12C24 5.4 18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.959-.6-.12-.421.18-.84.601-.96 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.3 1.141zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
        </svg>
      )
    default:
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      )
  }
}

const MAP_BASE_FOR_DARK = '#374151'
const MAP_BASE_FOR_GLASS = 'rgba(255,255,255,0.25)'

function mapBaseForTheme(themeKey: string): string | undefined {
  if (themeKey === 'midnight' || themeKey === 'forest') return MAP_BASE_FOR_DARK
  if (themeKey === 'vivid') return MAP_BASE_FOR_GLASS
  return undefined
}

function Stat({
  value,
  label,
  mutedClass,
  valueClass,
}: {
  value: React.ReactNode
  label: string
  mutedClass: string
  // Override for the number's class — themes that want bigger or
  // differently-styled numerals (Mono mono-bold, Vivid display-size) pass
  // this in via theme.statValueClass. Empty string = use the default.
  valueClass?: string
}) {
  return (
    <div className="text-center min-w-0">
      <div className={valueClass || 'text-2xl sm:text-3xl font-semibold tabular-nums'}>
        {value}
      </div>
      <div className={`text-[10px] sm:text-xs uppercase tracking-wide mt-0.5 ${mutedClass}`}>
        {label}
      </div>
    </div>
  )
}

// Translation-bound helpers — both NomadCard (client) and NomadCardServer
// (server) call these with their resolved translator to get a closure that
// the section renderers can call without re-binding.
export function makeGetLinkLabel(tLinkTypes: Translator) {
  return (type: string, customLabel?: string | null): string => {
    if (type === 'other') return customLabel || tLinkTypes('other')
    if ((LOCALISED_LINK_SLUGS as readonly string[]).includes(type)) return tLinkTypes(type)
    return type.charAt(0).toUpperCase() + type.slice(1)
  }
}

// Roles with a translation in the `roles.*` namespace. The form also accepts
// free-text custom roles (e.g. "Brand Designer"); those have no message and
// must render verbatim — calling t() on them raises MISSING_MESSAGE.
const LOCALISED_ROLE_SLUGS = [
  'Designer',
  'Product Designer',
  'Developer',
  'Writer',
  'Product Manager',
  'Marketer',
  'Consultant',
  'Entrepreneur',
  'Photographer',
  'Content Creator',
  'Engineer',
  'Founder',
  'Other',
] as const

export function isLocalisedRole(raw: string): boolean {
  return (LOCALISED_ROLE_SLUGS as readonly string[]).includes(raw)
}

export function makeLocaliseRole(tRole: Translator) {
  return (raw?: string): string | undefined => {
    if (!raw) return raw
    // Only translate known preset roles; custom roles render verbatim.
    return isLocalisedRole(raw) ? tRole(raw) : raw
  }
}

export function makeFormatShortDate(locale: string) {
  const formatter = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' })
  return (iso: string): string => {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return formatter.format(d)
  }
}

// Bundle of inputs the section renderers need. Both NomadCard (client) and
// NomadCardServer (server) build one of these and hand it to the factory.
// Translators come pre-resolved so the renderers themselves contain no hooks
// — keeping them callable from either rendering context.
export interface SectionContext {
  user: User
  links: NomadLink[]
  stays: NomadStay[]
  blurbs: NomadBlurb[]
  featuredWorks: NomadFeaturedWork[]
  theme: Theme
  shape: ButtonShapeClasses
  // 'icons' renders preset-brand links as a compact icon strip; anything
  // else (including null/undefined) falls back to the labelled full-row
  // layout. 'other' links and embeddable URLs always stay full-row.
  linksLayout: 'rows' | 'icons'
  t: Translator
  tStays: Translator
  tStatus: Translator
  tFeaturedWork: Translator
  getLinkLabel: (type: string, customLabel?: string | null) => string
  localisedRole: (raw?: string) => string | undefined
  formatShortDate: (iso: string) => string
  upcomingStays: NomadStay[]
  currentStay: NomadStay | null
  pastStays: NomadStay[]
  nextStay: NomadStay | null
  visitedStays: NomadStay[]
  displayLocation: string | undefined
  displayCountryFlag: string | null
  visitedCount: number
  // The "now" layer. Set by NomadCardServer ONLY when the presence affordance
  // applies — i.e. the shown location is the lightweight current_city (no
  // explicit current stay corroborating recency) and there's a confirmed-at
  // timestamp. undefined → render no freshness line and apply no fade, so the
  // client editing preview (NomadCard) can omit these entirely.
  presenceAgoLabel?: string
  presenceStale?: boolean
  // True when the viewer owns this card — gates the "I'm still here" confirm
  // button so visitors never see it.
  isOwner?: boolean
}

// Each section renders independently so the order can be reshuffled. Sections
// return null when their data is empty so reordering an empty block doesn't
// leave a whitespace gap.
export function createSectionRenderers(
  ctx: SectionContext,
): Record<string, () => React.ReactNode> {
  const {
    user,
    links,
    stays,
    blurbs,
    featuredWorks,
    theme,
    shape,
    linksLayout,
    t,
    tStays,
    tStatus,
    tFeaturedWork,
    getLinkLabel,
    localisedRole,
    formatShortDate,
    upcomingStays,
    currentStay,
    pastStays,
    nextStay,
    visitedStays,
    displayLocation,
    displayCountryFlag,
    visitedCount,
    presenceAgoLabel,
    presenceStale,
    isOwner,
  } = ctx

  return {
    avatar: () => (
      <div key="avatar">
        <ThemedAvatar user={user} theme={theme} />
      </div>
    ),
    name: () => (
      <div key="name" className="text-center mb-3 sm:mb-4">
        <h1
          className={
            theme.nameClass ||
            'text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight mb-1 sm:mb-2'
          }
        >
          {user.display_name || user.handle}
        </h1>
        {user.role && (
          <p
            className={`text-base sm:text-lg font-medium ${theme.textMuted} ${theme.roleClass}`}
          >
            {localisedRole(user.role)}
          </p>
        )}
      </div>
    ),
    location: () => {
      if (!displayLocation) return null
      return (
        <div key="location" className="text-center mb-2">
          {/* Fade the live location once the presence claim goes stale — a
              de-emphasised "Bangkok" reads as "was here", which is the honest
              state of an un-refreshed card. */}
          <p className={`text-base sm:text-lg transition-opacity ${presenceStale ? 'opacity-50' : ''}`}>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true">{displayCountryFlag || '📍'}</span>
              <span className="font-medium">{displayLocation}</span>
              <LiveLocalTime timezone={user.timezone} mutedClass={theme.textMuted} />
            </span>
          </p>
          {/* The "now" layer: how fresh the presence claim is. Only present
              when NomadCardServer decided the affordance applies. */}
          {presenceAgoLabel && (
            <p className={`mt-1 text-xs ${theme.textMuted}`}>
              {t('presence.confirmedAgo', { ago: presenceAgoLabel })}
              {presenceStale && <span> · {t('presence.mayBeStale')}</span>}
            </p>
          )}
          {/* One-tap re-confirm, owner-only, only when stale (no point nudging
              a fresh card). Refreshes the route to clear the fade in place. */}
          {presenceAgoLabel && presenceStale && isOwner && (
            <ConfirmPresenceButton accentHex={theme.accentHex} />
          )}
          {nextStay && (
            <p className={`mt-1 text-xs sm:text-sm ${theme.textMuted}`}>
              <span aria-hidden>→ </span>
              {tStays('nextLabel')}{' '}
              <span className="font-medium">{nextStay.city}</span>
              <span aria-hidden> · </span>
              {formatShortDate(nextStay.start_date)}
            </p>
          )}
        </div>
      )
    },
    bio: () => {
      if (!user.bio) return null
      // Brutalist themes get monospace square brackets in place of the
      // editorial " " typography quotes — same hierarchy, different language.
      const isBrackets = theme.bioQuoteStyle === 'brackets'
      const openMark = isBrackets ? '[' : '“'
      const closeMark = isBrackets ? ']' : '”'
      const markFontClass = isBrackets ? 'font-mono font-bold' : 'font-serif'
      const markOpacity = isBrackets ? 0.55 : 0.35
      return (
        <div key="bio" className="relative text-center mt-5 mb-6 max-w-lg mx-auto px-6">
          <span
            aria-hidden
            className={`absolute -top-3 left-0 text-5xl leading-none select-none ${markFontClass} ${theme.textMuted}`}
            style={{ opacity: markOpacity }}
          >
            {openMark}
          </span>
          <p className={`text-base leading-relaxed whitespace-pre-line ${theme.bioQuote} relative`}>
            {user.bio}
          </p>
          <span
            aria-hidden
            className={`absolute -bottom-6 right-0 text-5xl leading-none select-none ${markFontClass} ${theme.textMuted}`}
            style={{ opacity: markOpacity }}
          >
            {closeMark}
          </span>
        </div>
      )
    },
    blurbs: () => {
      if (!blurbs || blurbs.length === 0) return null
      // Two-column grid on wider cards, single on narrow. Label is small
      // uppercase muted, value is regular text — pairs read like editorial
      // metadata next to the bio (Now reading / Booking / Rate / Tools).
      return (
        <dl
          key="blurbs"
          className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 my-6"
        >
          {blurbs.map((blurb) => (
            <div key={blurb.id} className="min-w-0">
              <dt
                className={`text-[10px] uppercase tracking-wider mb-0.5 ${theme.textMuted}`}
              >
                {blurb.label}
              </dt>
              <dd className="text-sm leading-snug break-words">{blurb.value}</dd>
            </div>
          ))}
        </dl>
      )
    },
    work: () => {
      if (!featuredWorks || featuredWorks.length === 0) return null
      // Project tiles — bigger and more deliberate than a link row. Title
      // gets weight, optional description provides context, the whole tile
      // is clickable with an arrow indicator. Section title sits above so
      // visitors immediately read it as portfolio rather than "more links".
      return (
        <div key="work" className="my-6">
          <h3 className={`text-xs uppercase tracking-wider mb-3 ${theme.textMuted}`}>
            {tFeaturedWork('sectionTitle')}
          </h3>
          <ul className="space-y-2">
            {featuredWorks.map((work) => (
              <li key={work.id}>
                <a
                  href={work.url}
                  target="_blank"
                  rel="noopener noreferrer ugc nofollow"
                  className={`group flex items-start gap-3 ${shape.row} border ${theme.divider} px-4 py-3 transition-all duration-200 ${theme.linkHover}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-base leading-snug break-words">
                      {work.title}
                    </div>
                    {work.description && (
                      <p className={`mt-0.5 text-xs leading-snug break-words ${theme.textMuted}`}>
                        {work.description}
                      </p>
                    )}
                  </div>
                  <svg
                    className={`w-4 h-4 mt-1 shrink-0 transition ${theme.linkArrow}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )
    },
    stays: () => {
      if (!stays || stays.length === 0) return null
      return (
        <div key="stays" className="my-6">
          <h3 className={`text-xs uppercase tracking-wider mb-3 ${theme.textMuted}`}>
            {tStays('sectionTitle')}
          </h3>
          {upcomingStays.length > 0 && (
            <div className="mb-4">
              <h4 className={`text-[10px] uppercase tracking-wider mb-2 ${theme.textMuted}`}>
                {tStays('upcomingTitle')}
              </h4>
              <ul className="space-y-2">
                {upcomingStays.map((s) => (
                  <li
                    key={s.id}
                    className={`flex items-start gap-3 text-sm rounded-lg p-3 border border-dashed ${theme.divider}`}
                  >
                    <span className="text-lg leading-none mt-0.5" aria-hidden>
                      {getCountryFlag(s.country) || '✈️'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-medium">
                          {s.city}, {getCountryName(s.country)}
                        </span>
                        <span className={`text-xs ${theme.textMuted}`}>
                          {formatShortDate(s.start_date)}
                          {s.end_date ? ` – ${formatShortDate(s.end_date)}` : ''}
                        </span>
                      </div>
                      {s.notes && <p className={`text-xs mt-0.5 ${theme.textMuted}`}>{s.notes}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {currentStay && (
            <div className={`rounded-xl mb-3 border ${theme.divider} overflow-hidden`}>
              <CurrentStayPhotos
                photos={currentStay.photo_urls ?? []}
                caption={`${currentStay.city}, ${getCountryName(currentStay.country)}`}
              />
              <div className="p-4 flex items-start gap-3">
                <span className="text-2xl leading-none mt-0.5" aria-hidden>
                  {getCountryFlag(currentStay.country) || '📍'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-semibold text-base">
                      {currentStay.city}, {getCountryName(currentStay.country)}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${theme.pillVerified}`}>
                      {tStays('currentBadge')}
                    </span>
                  </div>
                  <div className={`text-xs mt-0.5 ${theme.textMuted}`}>
                    {tStays('currentDuration', {
                      days: stayDayCount(currentStay.start_date, currentStay.end_date),
                    })}
                  </div>
                  {currentStay.notes && (
                    <p className={`text-xs mt-1 ${theme.textMuted}`}>{currentStay.notes}</p>
                  )}
                </div>
              </div>
            </div>
          )}
          {pastStays.length > 0 && (
            <ul className="space-y-2">
              {pastStays.map((s) => {
                const photos = s.photo_urls ?? []
                return (
                  <li key={s.id} className="flex items-start gap-3 text-sm">
                    {photos.length > 0 ? (
                      <PastStayThumbnail
                        photos={photos}
                        caption={`${s.city}, ${getCountryName(s.country)}`}
                      />
                    ) : (
                      <span className="text-lg leading-none mt-0.5 w-6 text-center" aria-hidden>
                        {getCountryFlag(s.country) || '·'}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-medium">
                          {s.city}, {getCountryName(s.country)}
                        </span>
                        <span className={`text-xs ${theme.textMuted}`}>
                          {tStays('pastDuration', {
                            days: stayDayCount(s.start_date, s.end_date),
                          })}
                        </span>
                      </div>
                      {s.notes && <p className={`text-xs mt-0.5 ${theme.textMuted}`}>{s.notes}</p>}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )
    },
    stats: () => {
      // The strip is the nomad equivalent of a creator's "followers/posts/likes"
      // header: countries · (cities) · time on the road.
      //
      // totalDays priority: user.nomad_since (a single-field input most users
      // fill in 5s) wins over sum(stays). See computeTravelStats — the
      // fallback keeps power users who only filled stays accurate too.
      const { cityCount, totalDays } = computeTravelStats(
        visitedStays,
        user.nomad_since,
      )
      // Hide the whole strip if there's literally nothing to show.
      if (visitedCount === 0 && cityCount === 0 && totalDays === 0) return null
      const road = formatTimeOnTheRoad(totalDays)
      const roadUnitLabel =
        road.unit === 'year'
          ? t('unitYear')
          : road.unit === 'month'
            ? t('unitMonth')
            : t('unitDay')
      // The city column is meaningful only when the user has actually
      // logged stays. Without stays it would always read "0" — visually
      // identical to "missing data" and giving up valuable strip width
      // for no signal. Drop it in that case so the strip stays clean
      // for the 80% of users who only filled nomad_since + countries.
      const showCityStat = cityCount > 0
      return (
        <div key="stats" className="my-6">
          {/* Section title disambiguates the strip below — "23 countries"
              on its own is ambiguous (visited? want to visit?) until the
              eye lands on the "years nomading" stat or the map further
              down the card. */}
          <h3
            className={`text-xs uppercase tracking-wider mb-3 text-center ${theme.textMuted}`}
          >
            {t('travelTitle')}
          </h3>
          <div
            className={`flex items-center justify-center gap-4 sm:gap-10 py-4 border-y ${theme.divider}`}
          >
            <Stat
              value={visitedCount}
              label={visitedCount === 1 ? t('countryOne') : t('countryMany')}
              mutedClass={theme.textMuted}
              valueClass={theme.statValueClass}
            />
            {showCityStat && (
              <Stat
                value={cityCount}
                label={cityCount === 1 ? t('cityOne') : t('cityMany')}
                mutedClass={theme.textMuted}
                valueClass={theme.statValueClass}
              />
            )}
            <Stat
              value={road.value}
              label={roadUnitLabel}
              mutedClass={theme.textMuted}
              valueClass={theme.statValueClass}
            />
          </div>
        </div>
      )
    },
    map: () => {
      const cityDots = visitedStays
        .filter((s) => typeof s.lat === 'number' && typeof s.lon === 'number')
        .map((s) => ({
          city: s.city,
          country: s.country,
          lat: s.lat as number,
          lon: s.lon as number,
        }))
      if (visitedCount === 0 && cityDots.length === 0) return null
      return (
        <div key="map" className="my-6">
          <WorldMap
            visitedCodes={user.visited_countries}
            cityDots={cityDots}
            accentColor={theme.accentHex}
            baseColor={mapBaseForTheme(theme.key)}
          />
        </div>
      )
    },
    status: () => {
      const showVerified = user.verified === true
      const showWorkStatus =
        !!user.work_status && !REMOVED_STATUS_KEYS.has(user.work_status)
      // Chip suppressed when current_city is empty — "open to coffee in
      // nowhere" reads as a data bug, not an availability signal.
      const coffeeCity =
        user.open_to_coffee === true && user.current_city?.trim()
          ? user.current_city.trim()
          : null
      if (!showVerified && !showWorkStatus && !coffeeCity) return null
      return (
        <div key="status" className="flex items-center justify-center flex-wrap gap-2 mb-8">
          {showVerified && (
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${theme.pillVerified}`}
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M16.704 5.29a1 1 0 010 1.42l-8 8a1 1 0 01-1.42 0l-4-4a1 1 0 011.42-1.42L8 12.586l7.29-7.296a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              {t('verified')}
            </span>
          )}
          {showWorkStatus && (
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${theme.pillNeutral}`}
            >
              {(WORK_STATUS_KEYS as readonly string[]).includes(user.work_status!)
                ? tStatus(user.work_status!)
                : user.work_status}
            </span>
          )}
          {coffeeCity && (
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-opacity ${theme.pillNeutral} ${presenceStale ? 'opacity-50' : ''}`}
            >
              <span aria-hidden="true">☕️</span>
              {t('openToCoffee', { city: coffeeCity })}
            </span>
          )}
        </div>
      )
    },
    meetup: () => {
      const label = user.meetup_cta_label?.trim()
      const url = user.meetup_cta_url?.trim()
      if (!label || !url) return null
      // Secondary outlined button. Paired with the solid Hire CTA below
      // — same accent color, but border-only fill so visitors read it as
      // "lighter ask" (coffee, peer meetup) vs the primary hire conversion.
      return (
        <div key="meetup" className="my-3">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer ugc nofollow"
            className={`flex items-center justify-center gap-2 w-full px-4 sm:px-6 py-3 sm:py-3.5 ${shape.row} font-semibold border-2 touch-manipulation transition-all duration-200 ${theme.linkHover}`}
            style={{ borderColor: theme.accentHex, color: theme.accentHex }}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              {/* Coffee cup — universal "let's grab a coffee" cue. */}
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 8h1a4 4 0 010 8h-1M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3"
              />
            </svg>
            <span>{label}</span>
          </a>
        </div>
      )
    },
    hire: () => {
      const label = user.hire_cta_label?.trim()
      const url = user.hire_cta_url?.trim()
      if (!label || !url) return null
      // Solid accent button. Visually distinct from the bordered link rows
      // below so visitors read it as the primary conversion path (not just
      // another social link). Reuses theme.linkHover for consistent feel.
      return (
        <div key="hire" className="my-4">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer ugc nofollow"
            className={`flex items-center justify-center gap-2 w-full px-4 sm:px-6 py-3.5 sm:py-4 ${shape.row} font-semibold text-white touch-manipulation transition-all duration-200 ${theme.linkHover}`}
            style={{ backgroundColor: theme.accentHex }}
          >
            <span>{label}</span>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </a>
        </div>
      )
    },
    links: () => {
      if (!links.length) return null
      // Pre-classify so the icon-strip and full-row groups can render as
      // two independent blocks. Embeds always win regardless of layout —
      // a YouTube link the user wanted inline shouldn't silently collapse
      // into a tiny icon. 'other' has no recognisable glyph, so it stays
      // labelled even in icons mode.
      type Slot =
        | { kind: 'embed'; link: NomadLink; embed: NonNullable<ReturnType<typeof detectEmbed>> }
        | { kind: 'row'; link: NomadLink }
        | { kind: 'icon'; link: NomadLink }
      const slots: Slot[] = []
      for (const link of links) {
        if (!link.url) continue
        const embed = detectEmbed(link.url)
        if (embed) {
          slots.push({ kind: 'embed', link, embed })
          continue
        }
        if (linksLayout === 'icons' && link.type !== 'other') {
          slots.push({ kind: 'icon', link })
        } else {
          slots.push({ kind: 'row', link })
        }
      }

      const renderEmbed = (slot: Extract<Slot, { kind: 'embed' }>, key: React.Key) => {
        const iframeStyle: React.CSSProperties = slot.embed.aspectRatio
          ? { aspectRatio: slot.embed.aspectRatio, width: '100%' }
          : { height: `${slot.embed.height}px`, width: '100%' }
        return (
          <iframe
            key={key}
            src={slot.embed.embedUrl}
            title={slot.embed.title}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
            className={`${shape.row} border-0 block`}
            style={iframeStyle}
          />
        )
      }

      const renderRow = (link: NomadLink, key: React.Key) => {
        const brandColor = LINK_BRAND_COLORS[link.type]
        const baseClass = `flex items-center justify-center gap-3 w-full px-4 sm:px-6 py-3 sm:py-4 ${shape.row} font-medium group touch-manipulation transition-all duration-200 ${theme.linkHover} ${theme.linkRow}`
        return (
          <a
            key={key}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer ugc nofollow"
            className={baseClass}
          >
            <span
              className={`inline-flex items-center justify-center w-9 h-9 ${shape.chip} shrink-0 transition group-hover:scale-105`}
              style={
                brandColor ? { backgroundColor: `${brandColor}1f`, color: brandColor } : undefined
              }
            >
              {getLinkIcon(link.type)}
            </span>
            <span className="flex-1 text-left">{getLinkLabel(link.type, link.label)}</span>
            <svg
              className={`w-5 h-5 transition ${theme.linkArrow}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        )
      }

      const renderIcon = (link: NomadLink, key: React.Key) => {
        const brandColor = LINK_BRAND_COLORS[link.type]
        const label = getLinkLabel(link.type, link.label)
        return (
          <a
            key={key}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer ugc nofollow"
            aria-label={label}
            title={label}
            className={`inline-flex items-center justify-center w-12 h-12 ${shape.chip} ${theme.linkHover} ${theme.linkRow} transition-all duration-200 hover:scale-110 touch-manipulation`}
            style={
              brandColor ? { backgroundColor: `${brandColor}1f`, color: brandColor } : undefined
            }
          >
            {getLinkIcon(link.type)}
          </a>
        )
      }

      // Icons mode lifts every iconable link into a single strip at the
      // top, then renders anything that has to stay full-width (custom
      // 'other' labels, YouTube / Spotify embeds) below it in original
      // order. Interleaving — preserving the user's link order — left
      // 'other' links sandwiched between two icon strips, which looked
      // accidental rather than deliberate.
      const blocks: React.ReactNode[] = []
      const iconLinks = slots.filter((s): s is Extract<Slot, { kind: 'icon' }> => s.kind === 'icon')
      if (iconLinks.length > 0) {
        blocks.push(
          <div key="icons" className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {iconLinks.map((slot, i) => renderIcon(slot.link, i))}
          </div>,
        )
      }
      slots.forEach((slot, i) => {
        if (slot.kind === 'embed') blocks.push(renderEmbed(slot, `embed-${i}`))
        else if (slot.kind === 'row') blocks.push(renderRow(slot.link, `row-${i}`))
      })

      return (
        <div key="links" className="space-y-2 sm:space-y-3">
          {blocks}
        </div>
      )
    },
  }
}
