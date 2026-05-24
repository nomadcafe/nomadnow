'use client'

import React, { useEffect, useState } from 'react'
import { User, NomadLink } from '@/types/database'
import { OptimizedImage } from './OptimizedImage'
import { WorldMap } from './WorldMap'
import { MakeYoursCTA } from './MakeYoursCTA'
import Link from 'next/link'
import { getTheme, type ThemeKey } from '@/lib/themes'
import { reconcileSectionOrder, reconcileEnabledSections } from '@/lib/sections'

interface NomadCardProps {
  user: User
  links: NomadLink[]
  themeKey?: ThemeKey | string | null
  enabledSections?: string[] | null
  sectionOrder?: string[] | null
  // When true, the floating "Make yours →" CTA is suppressed. Use on the
  // /preview design-QA page (where the CTA would point users to make a card
  // they're already looking at a mock of).
  hideMakeYoursCTA?: boolean
}

const getLinkIcon = (type: string) => {
  switch (type) {
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
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
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

const workStatusLabels: Record<string, string> = {
  available: 'Open to collaboration',
  freelancing: 'Freelancing',
  busy: 'Busy',
  fulltime: 'Full-time',
}

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

function formatMemberSince(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  } catch {
    return null
  }
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
}: NomadCardProps) {
  const [copied, setCopied] = useState(false)
  const theme = getTheme(themeKey)
  const displayLocation = user.current_city || user.location
  const localTime = useLocalTime(user.timezone)
  const visitedCount = user.visited_countries?.length ?? 0
  const memberSince = formatMemberSince(user.created_at)

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
          <p className={`text-base sm:text-lg font-medium ${theme.textMuted}`}>{user.role}</p>
        )}
      </div>
    ),
    location: () => {
      if (!displayLocation && !user.hometown) return null
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
          {user.hometown && (
            <p className={`text-sm mt-1 ${theme.textMuted}`}>From {user.hometown}</p>
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
          <p className={`text-base leading-relaxed ${theme.bioQuote} relative`}>
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
    stats: () => {
      if (visitedCount === 0 && !memberSince) return null
      return (
        <div
          key="stats"
          className={`flex items-center justify-center gap-6 sm:gap-10 my-6 py-4 border-y ${theme.divider}`}
        >
          {visitedCount > 0 && (
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-semibold tabular-nums">
                {visitedCount}
              </div>
              <div className={`text-xs uppercase tracking-wide mt-0.5 ${theme.textMuted}`}>
                {visitedCount === 1 ? 'country' : 'countries'}
              </div>
            </div>
          )}
          {memberSince && (
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-semibold">{memberSince}</div>
              <div className={`text-xs uppercase tracking-wide mt-0.5 ${theme.textMuted}`}>
                member since
              </div>
            </div>
          )}
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
          Verified
        </span>
        {user.work_status && (
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${theme.pillNeutral}`}
          >
            {workStatusLabels[user.work_status] || user.work_status}
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
            .map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center gap-3 w-full px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-medium group touch-manipulation transition-all duration-200 motion-safe:hover:-translate-y-0.5 hover:shadow-md ${theme.linkRow}`}
              >
                <span className="opacity-80 group-hover:opacity-100 transition">
                  {getLinkIcon(link.type)}
                </span>
                <span className="flex-1 text-left">
                  {link.type === 'other' && link.label
                    ? link.label
                    : link.type.charAt(0).toUpperCase() + link.type.slice(1)}
                </span>
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
              </a>
            ))}
        </div>
      )
    },
  }

  // Render only sections the user has enabled, in their preferred order.
  // Required sections that the user tried to disable get forced back on by reconcileEnabledSections.
  const renderedSections = order
    .filter((id) => enabled.has(id) && id in sectionRenderers)
    .map((id) => sectionRenderers[id]())

  return (
    <div className={`min-h-screen ${theme.page} ${theme.font}`}>
      {!hideMakeYoursCTA && <MakeYoursCTA />}

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
        <div className={`${theme.card} ${theme.text} p-6 sm:p-8 md:p-12`}>
          {renderedSections}

          {/* Share — always last, not reorderable. */}
          <div className={`mt-8 pt-8 border-t ${theme.divider} text-center`}>
            <p className={`text-sm mb-2 ${theme.textMuted}`}>Share this card</p>
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
                aria-label="Copy link"
                title={copied ? 'Copied!' : 'Copy link'}
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
