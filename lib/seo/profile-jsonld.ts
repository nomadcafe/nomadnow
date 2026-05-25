import type { User, NomadStay } from '@/types/database'
import { mergedVisitedCodes, splitStays } from '@/lib/stays'
import { getCountryName } from '@/lib/countries'

const SITE_ORIGIN = 'https://nomad.now'

// schema.org Person for a public nomad card. Nomad-flavored only — Creator
// Profile was deprecated. Upcoming stays are intentionally excluded from
// `additionalProperty: Visited countries` since a place a user hasn't gone
// to yet shouldn't bump rich-result counts.
export function buildProfileJsonLd(user: User, stays: NomadStay[]) {
  const currentLocation = user.current_city || user.location
  const buckets = splitStays(stays)
  const visitedForSeo = buckets.current
    ? [buckets.current, ...buckets.past]
    : buckets.past
  const visitedNames = Array.from(
    mergedVisitedCodes(user.visited_countries, visitedForSeo),
  )
    .map((code) => getCountryName(code))
    .filter(Boolean)

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: user.display_name || user.handle,
    alternateName: `@${user.handle}`,
    identifier: `@${user.handle}`,
    description:
      user.bio ||
      `Digital nomad${user.role ? ` · ${user.role}` : ''}${currentLocation ? ` · currently in ${currentLocation}` : ''}`,
    url: `${SITE_ORIGIN}/${user.handle}`,
    image: user.avatar_url,
    ...(user.website && { mainEntityOfPage: user.website }),
    ...(currentLocation && {
      address: { '@type': 'PostalAddress', addressLocality: currentLocation },
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
}

export function buildProfileBreadcrumbJsonLd(user: User) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: SITE_ORIGIN,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: user.display_name || user.handle,
        item: `${SITE_ORIGIN}/${user.handle}`,
      },
    ],
  }
}
