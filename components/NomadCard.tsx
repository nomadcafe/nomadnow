'use client'

import React, { useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import type { User, NomadLink, NomadStay, NomadBlurb, NomadFeaturedWork } from '@/types/database'
import { getCountryFlag } from '@/lib/countries'
import { mergedVisitedCodes, splitStays } from '@/lib/stays'
import { MakeYoursCTA } from './MakeYoursCTA'
import { EditCardCTA } from './EditCardCTA'
import { CardCopyLink } from './nomad-card/CardCopyLink'
import { ThemeDecoration } from './nomad-card/ThemeDecoration'
import { getTheme, getButtonShape, type ThemeKey } from '@/lib/themes'
import { resolveBackgroundCss } from '@/lib/card-background'
import { getFontClassName } from '@/lib/fonts'
import { reconcileSectionOrder, reconcileEnabledSections } from '@/lib/sections'
import {
  createSectionRenderers,
  makeFormatShortDate,
  makeGetLinkLabel,
  makeLocaliseRole,
  type SectionContext,
} from './nomad-card/sections'

interface NomadCardProps {
  user: User
  links: NomadLink[]
  stays?: NomadStay[]
  blurbs?: NomadBlurb[]
  featuredWorks?: NomadFeaturedWork[]
  themeKey?: ThemeKey | string | null
  // Corner-radius preset for link buttons — see lib/themes.ts. Orthogonal
  // to theme color so any theme works with any shape.
  buttonShape?: string | null
  // Optional override for the outer page background. When set, replaces
  // the theme's bg class with a CSS color or linear-gradient. Resolved
  // through lib/card-background.ts; invalid values fall through to the
  // theme default rather than throwing.
  backgroundMode?: string | null
  backgroundValue?: unknown
  // Font override key from lib/fonts.ts. Null / 'theme' falls back to
  // the theme's own font class.
  fontFamily?: string | null
  // Hex accent override applied via getTheme. Null = use theme preset accent.
  accentColor?: string | null
  // Per-axis preset unbundling. Each null = inherit the chosen theme's value.
  // Validated against the catalog in getTheme; bad values fall through.
  decorationOverride?: string | null
  avatarStyleOverride?: string | null
  bioQuoteStyleOverride?: string | null
  // 'icons' (default) or 'rows'. Anything else falls back to 'icons' so
  // junk values can't break the render. Default flipped to 'icons' because
  // preset-brand glyphs are universally recognised — full-row labelled
  // buttons are vertical-space-heavy and read as generic Linktree.
  linksLayout?: string | null
  enabledSections?: string[] | null
  sectionOrder?: string[] | null
  // When true, the floating "Make yours →" CTA is suppressed. Use on the
  // /preview design-QA page (where the CTA would point users to make a card
  // they're already looking at a mock of).
  hideMakeYoursCTA?: boolean
  // True when the viewer is the card owner. Renders the EditCardCTA
  // floating button (→ /settings) instead of the visitor-targeted
  // MakeYoursCTA.
  isOwner?: boolean
  // True when the card is rendered inside another page (e.g. the live
  // preview panel on /create-card). Drops the full-screen page wrapper
  // and floating CTAs so the card fits a constrained container.
  embedded?: boolean
}

// Client wrapper around the shared section renderers. Used by editing
// previews (settings, create-card LiveCardPreview) where reactive prop
// updates need to re-render the whole card on the client. The public
// /[handle] route uses NomadCardServer instead, which builds the same
// section ctx server-side so the static markup ships pre-rendered.
export function NomadCard({
  user,
  links,
  themeKey,
  buttonShape,
  backgroundMode,
  backgroundValue,
  fontFamily,
  accentColor,
  decorationOverride,
  avatarStyleOverride,
  bioQuoteStyleOverride,
  linksLayout,
  enabledSections,
  sectionOrder,
  hideMakeYoursCTA = false,
  isOwner = false,
  embedded = false,
  stays = [],
  blurbs = [],
  featuredWorks = [],
}: NomadCardProps) {
  const t = useTranslations('card')
  const tStays = useTranslations('stays')
  const tStatus = useTranslations('card.workStatus')
  const tFeaturedWork = useTranslations('card.featuredWork')
  const tRole = useTranslations('roles')
  const tLinkTypes = useTranslations('card.linkTypes')
  const locale = useLocale()

  const theme = getTheme(themeKey, {
    accent: accentColor,
    decoration: decorationOverride,
    avatarStyle: avatarStyleOverride,
    bioQuoteStyle: bioQuoteStyleOverride,
  })
  const shape = getButtonShape(buttonShape)
  const customBg = resolveBackgroundCss(backgroundMode, backgroundValue)
  // Empty string for theme-default; otherwise the next/font className wins
  // over theme.font because it applies font-family directly via inline CSS.
  const customFontClass = getFontClassName(fontFamily)

  // Split stays into upcoming / current / past once and re-use throughout
  // the render — the rules for "what is current" (open-ended, start date in
  // the past) and "what counts as visited" (not upcoming) need to agree
  // across the header, the map, the stats, and the timeline.
  const { upcoming: upcomingStays, current: currentStay, past: pastStays } =
    splitStays(stays)
  const nextStay = upcomingStays[0] ?? null
  // Anything we count as "visited" excludes future stays — a place I haven't
  // gone to yet shouldn't bump my country count or light up the map.
  const visitedStays = currentStay ? [currentStay, ...pastStays] : pastStays
  const displayLocation = currentStay?.city || user.current_city || user.location
  // Flag for the location row: prefer the country of the current stay
  // (most precise), fall back to user.country (auto-set when current_city
  // was picked from CityAutocomplete). When neither is available, the
  // renderer falls back to a generic 📍 emoji.
  const displayCountryFlag = currentStay
    ? getCountryFlag(currentStay.country)
    : user.country
      ? getCountryFlag(user.country)
      : null
  const visitedCount = mergedVisitedCodes(user.visited_countries, visitedStays).size

  const formatShortDate = useMemo(() => makeFormatShortDate(locale), [locale])
  const getLinkLabel = useMemo(() => makeGetLinkLabel(tLinkTypes), [tLinkTypes])
  const localisedRole = useMemo(() => makeLocaliseRole(tRole), [tRole])

  const ctx: SectionContext = {
    user,
    links,
    stays,
    blurbs,
    featuredWorks,
    theme,
    shape,
    linksLayout: linksLayout === 'rows' ? 'rows' : 'icons',
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
  }
  const sectionRenderers = createSectionRenderers(ctx)

  const order = reconcileSectionOrder(user.profile_type, sectionOrder)
  const enabled = reconcileEnabledSections(user.profile_type, enabledSections)

  // Render only sections the user has enabled, in their preferred order.
  // Required sections that the user tried to disable are forced back on by
  // reconcileEnabledSections.
  const renderedSections = order
    .filter((id) => enabled.has(id) && id in sectionRenderers)
    .map((id) => sectionRenderers[id]())

  // Embedded mode: drop the full-screen wrapper and floating CTAs so the
  // card fits inside a constrained parent (the live preview panel on
  // /create-card and /settings). The inner card keeps its theme styling so
  // users see the real look.
  if (embedded) {
    return (
      <div
        className={`${customFontClass || theme.font} ${customBg ? '' : theme.page} rounded-2xl p-4 sm:p-6`}
        style={customBg ? { background: customBg } : undefined}
      >
        <div className={`relative overflow-hidden ${theme.card} ${theme.text} p-5 sm:p-6`}>
          <ThemeDecoration variant={theme.decoration} />
          <div className="relative">
            {renderedSections}
            <div className={`mt-6 pt-6 border-t ${theme.divider} text-center`}>
              <p className={`text-xs ${theme.textMuted}`}>nomad.now/{user.handle || 'yourhandle'}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`min-h-screen ${customBg ? '' : theme.page} ${customFontClass || theme.font}`}
      style={customBg ? { background: customBg } : undefined}
    >
      {isOwner ? <EditCardCTA /> : !hideMakeYoursCTA && <MakeYoursCTA />}

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
        <div className={`relative overflow-hidden ${theme.card} ${theme.text} p-6 sm:p-8 md:p-12`}>
          <ThemeDecoration variant={theme.decoration} />
          <div className="relative">
            {renderedSections}

            {/* Share — always last, not reorderable. */}
            <div className={`mt-8 pt-8 border-t ${theme.divider} text-center`}>
              <p className={`text-sm mb-2 ${theme.textMuted}`}>{t('shareTitle')}</p>
              <CardCopyLink handle={user.handle} mutedClass={theme.textMuted} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
