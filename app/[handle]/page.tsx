import React from 'react'
import { NomadCardServer } from '@/components/NomadCardServer'
import { ProfileNotFound } from '@/components/ProfileNotFound'
import { ProfileExpired } from '@/components/ProfileExpired'
import { CelebrationBanner } from '@/components/CelebrationBanner'
import type { Metadata } from 'next'
import { isReservedHandle } from '@/lib/reserved-handles'
import { getBillingState } from '@/lib/billing'
import { createServerSupabase } from '@/lib/supabase/server'
import { getProfileByHandle } from '@/lib/profile'
import { buildProfileJsonLd, buildProfileBreadcrumbJsonLd } from '@/lib/seo/profile-jsonld'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>
}): Promise<Metadata> {
  const { handle } = await params

  if (isReservedHandle(handle)) {
    return { title: 'Not found — Nomad.now' }
  }

  const profileData = await getProfileByHandle(handle)

  if (!profileData) {
    return {
      title: 'Profile Not Found - Nomad.now',
    }
  }

  const { user } = profileData
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
    alternates: { canonical: url },
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

  const { user, settings, nomadLinks, nomadStays } = profileData

  // Subscription gate. If the owner canceled and the paid period has elapsed,
  // we hide the card entirely — keeps the paid-only model honest. Active and
  // past_due subs render normally (we accept past_due as grace).
  // Billing state goes through the admin client (see lib/billing.ts) so the
  // raw subscription_status / current_period_end never leave the server.
  const billing = await getBillingState(user.id)
  if (billing.isExpired) {
    return <ProfileExpired handle={handle} />
  }

  const isOwner = viewerResult.data.user?.id === user.id

  const jsonLd = buildProfileJsonLd(user, nomadStays || [])
  const breadcrumbJsonLd = buildProfileBreadcrumbJsonLd(user)

  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Mounted only when the user just landed from /create-card. Gating at
          the server means the banner's JS doesn't ship to repeat visitors. */}
      {showCelebration && <CelebrationBanner handle={handle} />}

      <NomadCardServer
        user={user}
        links={nomadLinks || []}
        stays={nomadStays || []}
        themeKey={settings?.theme_color}
        buttonShape={settings?.button_shape}
        backgroundMode={settings?.background_mode}
        backgroundValue={settings?.background_value}
        fontFamily={settings?.font_family}
        enabledSections={settings?.enabled_sections}
        sectionOrder={settings?.section_order}
        isOwner={isOwner}
      />
    </>
  )
}

