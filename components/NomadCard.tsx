'use client'

import React, { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { User, NomadLink, NomadStay } from '@/types/database'
import { OptimizedImage } from './OptimizedImage'
import { WorldMap } from './WorldMap'
import { getCountryFlag, getCountryName } from '@/lib/countries'
import { stayDayCount, findCurrentStay } from '@/lib/stays'
import { MakeYoursCTA } from './MakeYoursCTA'
import { EditCardCTA } from './EditCardCTA'
import { VideoLightbox, detectVideo } from './VideoLightbox'
import Link from 'next/link'
import { getTheme, type ThemeKey } from '@/lib/themes'
import { reconcileSectionOrder, reconcileEnabledSections } from '@/lib/sections'

interface NomadCardProps {
  user: User
  links: NomadLink[]
  stays?: NomadStay[]
  themeKey?: ThemeKey | string | null
  enabledSections?: string[] | null
  sectionOrder?: string[] | null
  // When true, the floating "Make yours →" CTA is suppressed. Use on the
  // /preview design-QA page (where the CTA would point users to make a card
  // they're already looking at a mock of).
  hideMakeYoursCTA?: boolean
  // True when the viewer is the card owner. Renders the EditCardCTA
  // floating button (→ /settings) instead of the visitor-targeted
  // MakeYoursCTA. The hide-branding setting only governs visitor view;
  // owners always get their edit affordance.
  isOwner?: boolean
  // True when the card is rendered inside another page (e.g. the live
  // preview panel on /create-card). Drops the full-screen page wrapper
  // and floating CTAs so the card fits a constrained container.
  embedded?: boolean
}

// Slugs we localise via the `card.linkTypes.*` namespace. The DB still stores
// the slug (e.g. `twitter`) and we keep brand wordmarks identical across
// locales, so most labels resolve to a Latin-letter string anyway.
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
] as const

function useLinkLabel() {
  const t = useTranslations('card.linkTypes')
  return (type: string, customLabel?: string | null): string => {
    if (type === 'other') return customLabel || t('other')
    if ((LOCALISED_LINK_SLUGS as readonly string[]).includes(type)) return t(type)
    return type.charAt(0).toUpperCase() + type.slice(1)
  }
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
    default:
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      )
  }
}

// Active preset slugs. Custom strings render verbatim — the form lets users
// write their own status — and `available` was removed as a preset, so old
// cards that still have it stored fall through to REMOVED_STATUS_KEYS and
// don't render the pill at all.
const WORK_STATUS_KEYS = ['freelancing', 'busy', 'fulltime'] as const
const REMOVED_STATUS_KEYS = new Set(['available'])

function useLocalTime(timezone?: string) {
  const [time, setTime] = useState<string | null>(null)
  useEffect(() => {
    if (!timezone) return
    function tick() {
      try {
        setTime(
          new Date().toLocaleTimeString('en-US', {
            timeZone: timezone,
            hour: 'numeric',
            minute: '2-digit',
            hour12: false,
          })
        )
      } catch {
        setTime(null)
      }
    }
    tick()
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [timezone])
  return time
}

const MAP_BASE_FOR_DARK = '#374151'
const MAP_BASE_FOR_GLASS = 'rgba(255,255,255,0.25)'

function mapBaseForTheme(themeKey: string): string | undefined {
  if (themeKey === 'midnight' || themeKey === 'forest') return MAP_BASE_FOR_DARK
  if (themeKey === 'vivid') return MAP_BASE_FOR_GLASS
  return undefined
}

export function NomadCard({
  user,
  links,
  themeKey,
  enabledSections,
  sectionOrder,
  hideMakeYoursCTA = false,
  isOwner = false,
  embedded = false,
  stays = [],
}: NomadCardProps) {
  const t = useTranslations('card')
  const tStays = useTranslations('stays')
  const tStatus = useTranslations('card.workStatus')
  const tRole = useTranslations('roles')
  const getLinkLabel = useLinkLabel()
  const [copied, setCopied] = useState(false)
  // URL of the embed that's currently open in the video lightbox, or null
  // when no video is open. Detected from link URLs on click.
  const [videoEmbed, setVideoEmbed] = useState<string | null>(null)
  const theme = getTheme(themeKey)
  const displayLocation = user.current_city || user.location
  const localTime = useLocalTime(user.timezone)
  const visitedCount = user.visited_countries?.length ?? 0

  // Roles are stored in DB as their English label (the select in /create-card
  // posts that string). Map back to a localised label when the slug matches;
  // otherwise (custom role text) show the raw value.
  const localisedRole = (raw?: string) => {
    if (!raw) return raw
    try {
      const v = tRole(raw)
      // next-intl returns the key itself when missing; treat that as fallback.
      return v === raw ? raw : v
    } catch {
      return raw
    }
  }

  const order = reconcileSectionOrder(user.profile_type, sectionOrder)
  const enabled = reconcileEnabledSections(user.profile_type, enabledSections)

  const handleCopyLink = async () => {
    const url = `https://nomad.now/${user.handle}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = url
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // Ignore
      }
      document.body.removeChild(textArea)
    }
  }

  // Each section is rendered independently so the order can be reshuffled.
  // Sections return null when their data is empty so reordering an empty block
  // doesn't leave whitespace gaps.
  const sectionRenderers: Record<string, () => React.ReactNode> = {
    avatar: () => (
      <div key="avatar" className="flex justify-center mb-4 sm:mb-6">
        <div
          className="relative rounded-full p-[3px] shadow-lg shadow-black/10"
          style={{
            // Theme-tinted soft ring around the avatar — uses accent at low alpha
            // so it works on light AND dark themes without overpowering.
            background: `linear-gradient(135deg, ${theme.accentHex}33, ${theme.accentHex}11)`,
          }}
        >
          {user.avatar_url ? (
            <OptimizedImage
              src={user.avatar_url}
              alt={user.display_name || user.handle}
              width={120}
              height={120}
              className="w-24 h-24 sm:w-30 sm:h-30 rounded-full object-cover ring-2 ring-white/80 block"
              priority
            />
          ) : (
            <div
              className="w-24 h-24 sm:w-30 sm:h-30 rounded-full flex items-center justify-center text-3xl sm:text-4xl font-semibold text-white ring-2 ring-white/80"
              style={{
                background: `linear-gradient(135deg, ${theme.accentHex}, ${theme.accentHex}99)`,
              }}
            >
              {(user.display_name || user.handle).charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    ),
    name: () => (
      <div key="name" className="text-center mb-3 sm:mb-4">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight mb-1 sm:mb-2">
          {user.display_name || user.handle}
        </h1>
        {user.role && (
          <p className={`text-base sm:text-lg font-medium ${theme.textMuted}`}>{localisedRole(user.role)}</p>
        )}
      </div>
    ),
    location: () => {
      if (!displayLocation) return null
      return (
        <div key="location" className="text-center mb-2">
          {displayLocation && (
            <p className="text-base sm:text-lg">
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true">📍</span>
                <span className="font-medium">{displayLocation}</span>
                {localTime && (
                  <>
                    <span className={`${theme.textMuted}`} aria-hidden>
                      ·
                    </span>
                    {/* Live pulse dot — same language as the Logo, signals "now". */}
                    <span className="relative inline-flex items-center" aria-hidden>
                      <span className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-green-500 opacity-70 motion-safe:animate-ping" />
                      <span className="relative w-1.5 h-1.5 rounded-full bg-green-500" />
                    </span>
                    <span
                      className={`font-mono tabular-nums text-sm sm:text-base ${theme.textMuted}`}
                      aria-label={`Local time ${localTime}`}
                    >
                      {localTime}
                    </span>
                  </>
                )}
              </span>
            </p>
          )}
        </div>
      )
    },
    bio: () => {
      if (!user.bio) return null
      return (
        <div key="bio" className="relative text-center mt-5 mb-6 max-w-lg mx-auto px-6">
          {/* Decorative oversized opening quote — editorial flourish, very low opacity. */}
          <span
            aria-hidden
            className={`absolute -top-3 left-0 text-5xl leading-none font-serif select-none ${theme.textMuted}`}
            style={{ opacity: 0.35 }}
          >
            &ldquo;
          </span>
          <p className={`text-base leading-relaxed whitespace-pre-line ${theme.bioQuote} relative`}>
            {user.bio}
          </p>
          <span
            aria-hidden
            className={`absolute -bottom-6 right-0 text-5xl leading-none font-serif select-none ${theme.textMuted}`}
            style={{ opacity: 0.35 }}
          >
            &rdquo;
          </span>
        </div>
      )
    },
    stays: () => {
      if (!stays || stays.length === 0) return null
      const currentStay = findCurrentStay(stays)
      // Past stays = everything except the current one. Already ordered
      // most-recent-first by the API query.
      const pastStays = stays.filter((s) => s !== currentStay)
      return (
        <div key="stays" className="my-6">
          <h3 className={`text-xs uppercase tracking-wider mb-3 ${theme.textMuted}`}>
            {tStays('sectionTitle')}
          </h3>
          {currentStay && (
            <div
              className={`rounded-xl p-4 mb-3 border ${theme.divider} bg-opacity-50 flex items-start gap-3`}
            >
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
          )}
          {pastStays.length > 0 && (
            <ul className="space-y-2">
              {pastStays.map((s) => (
                <li
                  key={s.id}
                  className="flex items-start gap-3 text-sm"
                >
                  <span className="text-lg leading-none mt-0.5" aria-hidden>
                    {getCountryFlag(s.country) || '·'}
                  </span>
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
                    {s.notes && (
                      <p className={`text-xs mt-0.5 ${theme.textMuted}`}>{s.notes}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )
    },
    stats: () => {
      // Stats used to also show "member since {date}" — dropped because it
      // doesn't carry information visitors care about and adds visual
      // weight competing with the actual content (countries, stays).
      if (visitedCount === 0) return null
      return (
        <div
          key="stats"
          className={`flex items-center justify-center gap-6 sm:gap-10 my-6 py-4 border-y ${theme.divider}`}
        >
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-semibold tabular-nums">
              {visitedCount}
            </div>
            <div className={`text-xs uppercase tracking-wide mt-0.5 ${theme.textMuted}`}>
              {visitedCount === 1 ? t('countryOne') : t('countryMany')}
            </div>
          </div>
        </div>
      )
    },
    map: () => {
      if (visitedCount === 0) return null
      return (
        <div key="map" className="my-6">
          <WorldMap
            visitedCodes={user.visited_countries}
            accentColor={theme.accentHex}
            baseColor={mapBaseForTheme(theme.key)}
          />
        </div>
      )
    },
    status: () => (
      <div key="status" className="flex items-center justify-center flex-wrap gap-2 mb-8">
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
        {user.work_status && !REMOVED_STATUS_KEYS.has(user.work_status) && (
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${theme.pillNeutral}`}
          >
            {(WORK_STATUS_KEYS as readonly string[]).includes(user.work_status)
              ? tStatus(user.work_status)
              : user.work_status}
          </span>
        )}
      </div>
    ),
    links: () => {
      if (!links.length) return null
      return (
        <div key="links" className="space-y-2 sm:space-y-3">
          {links
            .filter((link) => link.url)
            .map((link, index) => {
              const video = detectVideo(link.url)
              const baseClass = `flex items-center justify-center gap-3 w-full px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-medium group touch-manipulation transition-all duration-200 motion-safe:hover:-translate-y-0.5 hover:shadow-md ${theme.linkRow}`
              const inner = (
                <>
                  <span className="opacity-80 group-hover:opacity-100 transition">
                    {getLinkIcon(link.type)}
                  </span>
                  <span className="flex-1 text-left">
                    {getLinkLabel(link.type, link.label)}
                  </span>
                  {/* Video rows show a play triangle; external rows keep the
                      "open in new tab" glyph so the visual signals the
                      different behaviours. */}
                  {video ? (
                    <svg
                      className={`w-5 h-5 transition ${theme.linkArrow}`}
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  ) : (
                    <svg
                      className={`w-5 h-5 transition ${theme.linkArrow}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  )}
                </>
              )
              if (video) {
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setVideoEmbed(video.embedUrl)}
                    className={baseClass}
                  >
                    {inner}
                  </button>
                )
              }
              return (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={baseClass}
                >
                  {inner}
                </a>
              )
            })}
        </div>
      )
    },
  }

  // Render only sections the user has enabled, in their preferred order.
  // Required sections that the user tried to disable get forced back on by reconcileEnabledSections.
  const renderedSections = order
    .filter((id) => enabled.has(id) && id in sectionRenderers)
    .map((id) => sectionRenderers[id]())

  // Embedded mode: drop the full-screen wrapper and floating CTAs so the
  // card fits inside a constrained parent (e.g. the live preview panel).
  // The inner card keeps its theme styling so users see the real look.
  if (embedded) {
    return (
      <div className={`${theme.font}`}>
        <div className={`${theme.card} ${theme.text} p-5 sm:p-6`}>
          {renderedSections}
          <div className={`mt-6 pt-6 border-t ${theme.divider} text-center`}>
            <p className={`text-xs ${theme.textMuted}`}>nomad.now/{user.handle || 'yourhandle'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${theme.page} ${theme.font}`}>
      {videoEmbed && <VideoLightbox url={videoEmbed} onClose={() => setVideoEmbed(null)} />}
      {isOwner ? <EditCardCTA /> : !hideMakeYoursCTA && <MakeYoursCTA />}

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
        <div className={`${theme.card} ${theme.text} p-6 sm:p-8 md:p-12`}>
          {renderedSections}

          {/* Share — always last, not reorderable. */}
          <div className={`mt-8 pt-8 border-t ${theme.divider} text-center`}>
            <p className={`text-sm mb-2 ${theme.textMuted}`}>{t('shareTitle')}</p>
            <div className="flex items-center justify-center gap-2">
              <Link
                href={`https://nomad.now/${user.handle}`}
                className={`text-sm font-mono ${theme.textMuted} hover:opacity-100 opacity-80 transition`}
              >
                nomad.now/{user.handle}
              </Link>
              <button
                onClick={handleCopyLink}
                className={`p-2 sm:p-2.5 transition relative touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center opacity-60 hover:opacity-100 ${theme.textMuted}`}
                aria-label={t('copyLink')}
                title={copied ? t('copied') : t('copyLink')}
              >
                {copied ? (
                  <svg
                    className="w-4 h-4 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
