import React from 'react'
import { NomadCardServer } from '@/components/NomadCardServer'
import { ProfileNotFound } from '@/components/ProfileNotFound'
import { CelebrationBanner } from '@/components/CelebrationBanner'
import type { Metadata } from 'next'
import { isReservedHandle } from '@/lib/reserved-handles'
import { getBillingState, isPro } from '@/lib/billing'
import { createServerSupabase } from '@/lib/supabase/server'
import { getProfileByHandle } from '@/lib/profile'
import { buildProfileJsonLd, buildProfileBreadcrumbJsonLd } from '@/lib/seo/profile-jsonld'
import { serializeJsonLd } from '@/lib/seo/json-ld'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>
}): Promise<Metadata> {
  const { handle } = await params

  // Missing/reserved handles render the "claim this handle" UI at HTTP 200
  // (intentional — see ProfilePage), so noindex them or Google treats every
  // /random-string as a thin, indexable soft-404.
  if (isReservedHandle(handle)) {
    return { title: 'Not found — Nomad.now', robots: { index: false, follow: false } }
  }

  const profileData = await getProfileByHandle(handle)

  if (!profileData) {
    return {
      title: 'Profile Not Found - Nomad.now',
      robots: { index: false, follow: false },
    }
  }

  const { user } = profileData

  // Freemium: a free card renders in full and is meant to be shared on its
  // direct link — so it keeps the whole OG/Twitter payload (a bare link with
  // no preview card is exactly what the free tier promises NOT to be). What
  // it doesn't get is search placement: discovery is the paid tier's value,
  // so an inactive plan means noindex. Everything below is shared; only
  // `robots` and `alternates` differ (a noindex page shouldn't advertise a
  // canonical either).
  const billing = await getBillingState(user.id)
  const isPaid = billing.isActive

  const name = user.display_name || user.handle
  const title = `${name} — Nomad.now`
  const description =
    user.bio ||
    [user.role, user.current_city ? `in ${user.current_city}` : null]
      .filter(Boolean)
      .join(' · ') ||
    `${name}'s nomad card`
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://nomad.now')
  const url = `${baseUrl}/${user.handle}`
  const ogImage = `${baseUrl}/og/${user.handle}`

  return {
    title,
    description,
    ...(isPaid
      ? { alternates: { canonical: url } }
      : { robots: { index: false, follow: false } }),
    openGraph: {
      title,
      description,
      type: 'profile',
      url,
      siteName: 'Nomad.now',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${name}'s nomad card`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    keywords: [
      name,
      'digital nomad',
      'nomad card',
      user.current_city || '',
      user.role || '',
    ].filter(Boolean),
  }
}

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>
  searchParams: Promise<{ celebrate?: string }>
}) {
  const [{ handle }, query] = await Promise.all([params, searchParams])
  const showCelebration = query.celebrate === '1'

  // Reserved + missing both fall through to ProfileNotFound which itself
  // picks the right state (reserved / available / invalid). The Next 404
  // page is reserved for truly unrecoverable routes.
  if (isReservedHandle(handle)) {
    return <ProfileNotFound handle={handle} />
  }

  // Auth check is independent of the profile fetch, so kick both off in
  // parallel. Billing depends on the resolved user.id and runs after.
  const supabase = await createServerSupabase()
  const [profileData, viewerResult] = await Promise.all([
    getProfileByHandle(handle),
    supabase.auth.getUser(),
  ])

  if (!profileData) {
    return <ProfileNotFound handle={handle} />
  }

  const { user, settings, nomadLinks, nomadStays, nomadBlurbs, nomadFeaturedWorks } = profileData

  // Freemium: the card is ALWAYS public. Billing only changes what the card
  // gets, not whether it renders. An inactive plan (free / never-subscribed /
  // lapsed) still shows the card, but carries the "Made with Nomad.now"
  // footer, stays out of search (noindex — see generateMetadata) and out of
  // the /explore directory (plan filter in app/explore). A paid plan drops the
  // footer and gains discoverability; Pro adds accent / verified / image bg.
  // Billing state goes through the admin client (see lib/billing.ts) so the
  // raw subscription_status / current_period_end never leave the server.
  const billing = await getBillingState(user.id)
  const isPaid = billing.isActive

  const isOwner = viewerResult.data.user?.id === user.id

  // Pro-tier gates. Owner's saved values stay in the DB; the render path
  // simply ignores them when the account isn't Pro. Upgrading later instantly
  // restores the saved accent / badge without the user re-entering anything.
  const ownerIsPro = isPro(billing.plan)
  const effectiveUser = ownerIsPro ? user : { ...user, verified: false }
  const effectiveAccent = ownerIsPro ? settings?.accent_color : null

  const jsonLd = buildProfileJsonLd(user, nomadStays || [])
  const breadcrumbJsonLd = buildProfileBreadcrumbJsonLd(user)

  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />

      {/* Mounted only when the user just landed from /create-card. Gating at
          the server means the banner's JS doesn't ship to repeat visitors.
          The upgrade link inside is owner-and-free-only — a visitor who lands
          on someone else's ?celebrate=1 link shouldn't be sold an upgrade to
          a card that isn't theirs. */}
      {showCelebration && (
        <CelebrationBanner handle={handle} showUpgrade={isOwner && !isPaid} />
      )}

      <NomadCardServer
        user={effectiveUser}
        links={nomadLinks || []}
        stays={nomadStays || []}
        blurbs={nomadBlurbs || []}
        featuredWorks={nomadFeaturedWorks || []}
        themeKey={settings?.theme_color}
        buttonShape={settings?.button_shape}
        buttonStyle={settings?.button_style}
        backgroundMode={settings?.background_mode}
        backgroundValue={settings?.background_value}
        fontFamily={settings?.font_family}
        accentColor={effectiveAccent}
        decorationOverride={settings?.decoration_override}
        avatarStyleOverride={settings?.avatar_style_override}
        bioQuoteStyleOverride={settings?.bio_quote_style_override}
        linksLayout={settings?.links_layout}
        enabledSections={settings?.enabled_sections}
        sectionOrder={settings?.section_order}
        isOwner={isOwner}
        showBranding={!isPaid}
      />
    </>
  )
}

