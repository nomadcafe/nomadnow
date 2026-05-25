import React from 'react'
import { getTranslations, getLocale } from 'next-intl/server'
import type { User, NomadLink, NomadStay } from '@/types/database'
import { getCountryFlag } from '@/lib/countries'
import { mergedVisitedCodes, splitStays } from '@/lib/stays'
import { MakeYoursCTA } from './MakeYoursCTA'
import { EditCardCTA } from './EditCardCTA'
import { CardCopyLink } from './nomad-card/CardCopyLink'
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

interface NomadCardServerProps {
  user: User
  links: NomadLink[]
  stays?: NomadStay[]
  themeKey?: ThemeKey | string | null
  buttonShape?: string | null
  backgroundMode?: string | null
  backgroundValue?: unknown
  fontFamily?: string | null
  enabledSections?: string[] | null
  sectionOrder?: string[] | null
  // When true, the floating "Make yours →" CTA is suppressed. Used on the
  // /preview design-QA page where the CTA would point users to make a card
  // they're already looking at a mock of.
  hideMakeYoursCTA?: boolean
  // True when the viewer is the card owner. Renders the EditCardCTA
  // floating button instead of the visitor-targeted MakeYoursCTA.
  isOwner?: boolean
  // True when the card is rendered inside another page (e.g. the home
  // hero preview). Drops the full-screen page wrapper and floating CTAs
  // so the card fits a constrained container.
  embedded?: boolean
}

// Server-component sibling of NomadCard. Used by the static read paths
// (/[handle], /preview, /) where settings are fixed for the request — the
// markup ships pre-rendered so the visitor doesn't pay to hydrate the whole
// card. NomadCard (client) stays the entry point for editing previews where
// reactive prop changes need a client re-render.
export async function NomadCardServer({
  user,
  links,
  stays = [],
  themeKey,
  buttonShape,
  backgroundMode,
  backgroundValue,
  fontFamily,
  enabledSections,
  sectionOrder,
  hideMakeYoursCTA = false,
  isOwner = false,
  embedded = false,
}: NomadCardServerProps) {
  const [t, tStays, tStatus, tRole, tLinkTypes, locale] = await Promise.all([
    getTranslations('card'),
    getTranslations('stays'),
    getTranslations('card.workStatus'),
    getTranslations('roles'),
    getTranslations('card.linkTypes'),
    getLocale(),
  ])

  const theme = getTheme(themeKey)
  const shape = getButtonShape(buttonShape)
  const customBg = resolveBackgroundCss(backgroundMode, backgroundValue)
  const customFontClass = getFontClassName(fontFamily)

  const { upcoming: upcomingStays, current: currentStay, past: pastStays } =
    splitStays(stays)
  const nextStay = upcomingStays[0] ?? null
  const visitedStays = currentStay ? [currentStay, ...pastStays] : pastStays
  const displayLocation = currentStay?.city || user.current_city || user.location
  const displayCountryFlag = currentStay ? getCountryFlag(currentStay.country) : null
  const visitedCount = mergedVisitedCodes(user.visited_countries, visitedStays).size

  const ctx: SectionContext = {
    user,
    links,
    stays,
    theme,
    shape,
    t,
    tStays,
    tStatus,
    getLinkLabel: makeGetLinkLabel(tLinkTypes),
    localisedRole: makeLocaliseRole(tRole),
    formatShortDate: makeFormatShortDate(locale),
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
  const renderedSections = order
    .filter((id) => enabled.has(id) && id in sectionRenderers)
    .map((id) => sectionRenderers[id]())

  if (embedded) {
    return (
      <div
        className={`${customFontClass || theme.font} ${customBg ? '' : theme.page} rounded-2xl p-4 sm:p-6`}
        style={customBg ? { background: customBg } : undefined}
      >
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
    <div
      className={`min-h-screen ${customBg ? '' : theme.page} ${customFontClass || theme.font}`}
      style={customBg ? { background: customBg } : undefined}
    >
      {isOwner ? <EditCardCTA /> : !hideMakeYoursCTA && <MakeYoursCTA />}

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
        <div className={`${theme.card} ${theme.text} p-6 sm:p-8 md:p-12`}>
          {renderedSections}

          {/* Share — always last, not reorderable. */}
          <div className={`mt-8 pt-8 border-t ${theme.divider} text-center`}>
            <p className={`text-sm mb-2 ${theme.textMuted}`}>{t('shareTitle')}</p>
            <CardCopyLink handle={user.handle} mutedClass={theme.textMuted} />
          </div>
        </div>
      </div>
    </div>
  )
}
