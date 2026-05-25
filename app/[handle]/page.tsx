import React from 'react'
import { NomadCard } from '@/components/NomadCard'
import { ProfileNotFound } from '@/components/ProfileNotFound'
import { ProfileExpired } from '@/components/ProfileExpired'
import { CelebrationBanner } from '@/components/CelebrationBanner'
import type { Metadata } from 'next'
import { isReservedHandle } from '@/lib/reserved-handles'
import { deriveBillingState } from '@/lib/billing'
import { getCountryName } from '@/lib/countries'
import { createServerSupabase } from '@/lib/supabase/server'

async function getProfileData(handle: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    
    const response = await fetch(`${baseUrl}/api/profile/${handle}`, {
      next: { 
        revalidate: 60, // Revalidate every minute
        tags: [`profile-${handle}`], // Add cache tag for manual revalidation
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`Failed to fetch profile: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    // Error is logged by the API route itself
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>
}): Promise<Metadata> {
  const { handle } = await params

  if (isReservedHandle(handle)) {
    return { title: 'Not found — Nomad.now' }
  }

  const profileData = await getProfileData(handle)

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
}: {
  params: Promise<{ handle: string }>
}) {
  const { handle } = await params

  // Reserved + missing both fall through to ProfileNotFound which itself
  // picks the right state (reserved / available / invalid). The Next 404
  // page is reserved for truly unrecoverable routes.
  if (isReservedHandle(handle)) {
    return <ProfileNotFound handle={handle} />
  }

  const profileData = await getProfileData(handle)

  if (!profileData) {
    return <ProfileNotFound handle={handle} />
  }

  const { user, settings, nomadLinks } = profileData

  // Subscription gate. If the owner canceled and the paid period has elapsed,
  // we hide the card entirely — keeps the paid-only model honest. Active and
  // past_due subs render normally (we accept past_due as grace).
  const billing = deriveBillingState(user)
  if (billing.isExpired) {
    return <ProfileExpired handle={handle} />
  }

  // Owner-of-this-card check, so NomadCard can swap "Make yours" for an
  // "Edit your card" floating CTA. Anonymous visitors skip the auth roundtrip.
  const supabase = await createServerSupabase()
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser()
  const isOwner = viewer?.id === user.id

  const currentLocation = user.current_city || user.location
  const visitedNames: string[] = (user.visited_countries ?? [])
    .map((code: string) => getCountryName(code))
    .filter(Boolean)

  // schema.org Person. Nomad-flavored only — Creator Profile was deprecated.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: user.display_name || user.handle,
    alternateName: `@${user.handle}`,
    identifier: `@${user.handle}`,
    description:
      user.bio ||
      `Digital nomad${user.role ? ` · ${user.role}` : ''}${currentLocation ? ` · currently in ${currentLocation}` : ''}`,
    url: `https://nomad.now/${user.handle}`,
    image: user.avatar_url,
    ...(user.website && { mainEntityOfPage: user.website }),
    ...(currentLocation && {
      address: { '@type': 'PostalAddress', addressLocality: currentLocation },
    }),
    ...(user.hometown && {
      homeLocation: { '@type': 'Place', name: user.hometown },
    }),
    ...(user.role && { jobTitle: user.role }),
    ...(visitedNames.length > 0 && {
      additionalProperty: {
        '@type': 'PropertyValue',
        name: 'Visited countries',
        value: visitedNames.join(', '),
      },
    }),
  }

  // Additional breadcrumb structured data
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://nomad.now',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: user.display_name || user.handle,
        item: `https://nomad.now/${user.handle}`,
      },
    ],
  }

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

      {/* Owner just finished creating the card via /create-card → show the
          celebratory share banner. No-op when the query param isn't present,
          so this is free to render for every viewer. */}
      <CelebrationBanner handle={handle} />

      <NomadCard
        user={user}
        links={nomadLinks || []}
        themeKey={settings?.theme_color}
        enabledSections={settings?.enabled_sections}
        sectionOrder={settings?.section_order}
        hideMakeYoursCTA={Boolean(settings?.hide_branding)}
        isOwner={isOwner}
      />
    </>
  )
}

