import type { MetadataRoute } from 'next'
import { createPublicSupabase } from '@/lib/supabase/public'
import { getEnvSafe } from '@/lib/env'
import { countries, slugForCountry } from '@/lib/countries'
import { siteUrl } from '@/lib/seo/site-url'

// Discovery is what the paid tiers buy, so the sitemap ships exactly the pages
// a crawler is allowed to index: the marketing/directory routes, every PAID
// card, and only the country pages that actually list someone. Free cards are
// deliberately absent — they carry `noindex` (see app/[handle]/page.tsx), and
// submitting a URL we tell Google not to index wastes crawl budget on a page
// that can never rank.
//
// Regenerated hourly. Supabase's default PostgREST page size caps a single
// request at 1000 rows; past that this needs range-paging (or a dedicated
// sitemap index), which is a problem worth having.
export const revalidate = 3600

const MAX_CARDS = 1000

interface CardRow {
  handle: string
  updated_at: string | null
  visited_countries: string[] | null
}

async function fetchIndexableCards(): Promise<CardRow[]> {
  try {
    const env = getEnvSafe()
    if (env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) return []

    const supabase = createPublicSupabase()
    const { data, error } = await supabase
      .from('users')
      .select('handle, updated_at, visited_countries')
      // Same population as /explore and /in/{country}: moderated cards are out,
      // and `plan` is non-null exactly while paid features are live (the Stripe
      // webhook clears it the moment they aren't — see app/api/billing/webhook).
      .eq('suspended', false)
      .not('plan', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(MAX_CARDS)

    if (error) throw error
    return (data ?? []) as CardRow[]
  } catch {
    // A sitemap that 500s gets the whole file dropped from Search Console. The
    // static routes below are always correct, so degrade to those instead.
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/explore`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/map`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]

  const cards = await fetchIndexableCards()

  const cardRoutes: MetadataRoute.Sitemap = cards.map((row) => ({
    url: `${base}/${row.handle}`,
    lastModified: row.updated_at ? new Date(row.updated_at) : now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  // Only countries with at least one listed nomad — an empty /in/{country} is
  // a thin page, and there are ~200 of them.
  const countryCodes = new Set<string>()
  for (const row of cards) {
    for (const code of row.visited_countries ?? []) countryCodes.add(code)
  }

  // /in/[country] resolves its slug against the map-plottable set only
  // (codeForSlug), so a code outside it would be a 404 in the sitemap.
  const plottable = new Set(countries.map((c) => c.code))

  const countryRoutes: MetadataRoute.Sitemap = Array.from(countryCodes)
    .filter((code) => plottable.has(code))
    .map((code) => slugForCountry(code))
    .map((slug) => ({
      url: `${base}/in/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))

  return [...staticRoutes, ...cardRoutes, ...countryRoutes]
}
