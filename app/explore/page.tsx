import React from 'react'
import Link from 'next/link'
import { unstable_cache } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { createPublicSupabase } from '@/lib/supabase/public'
import ExploreClient, { type Nomad } from '@/components/ExploreClient'
import { STALE_AFTER_DAYS } from '@/lib/presence'
import { EmptyState } from '@/components/EmptyState'
import { Logo } from '@/components/Logo'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import type { Metadata } from 'next'

type SortKey = 'recent' | 'countries' | 'alpha' | 'active'

// "Open to coffee" only means something if the presence behind it is fresh —
// an 8-month-old "open to coffee in Bali" is noise. The coffee filter requires
// a confirmation within this window so it answers "who's actually around and up
// for a coffee right now", which is the whole reason the directory beats a
// static /now-page list. Tighter than lib/presence.STALE_AFTER_DAYS (21d) on
// purpose: 21d is "don't trust the dot", a week is "they're genuinely here".
const COFFEE_FRESH_DAYS = 7

// The "open for work" filter requires a presence claim that hasn't gone stale —
// matching the card's own fade threshold (lib/presence.STALE_AFTER_DAYS). An
// "open for work" set two months ago and never refreshed is exactly the
// abandoned-card case the now-layer decay exists to hide, so it shouldn't
// surface in a "who's hireable right now" filter either. Looser than the
// coffee window (7d) on purpose: being available for remote work is a
// longer-lived claim than being around for a coffee this week.
const WORK_FRESH_DAYS = STALE_AFTER_DAYS

type NomadsResult = {
  nomads: Nomad[]
  totalPages: number
  currentPage: number
  total: number
}

// Public directory read. Browse views (no search term) are cached across
// requests — see getNomads. A search query bypasses the cache: search terms
// are high-cardinality (every term a distinct key) and the searcher expects
// fresh results.
async function getNomads(
  filters?: { search?: string; country?: string; sortBy?: SortKey; coffee?: boolean; work?: boolean },
  page: number = 1,
  pageSize: number = 24
): Promise<NomadsResult> {
  if (filters?.search) {
    return fetchNomads(filters, page, pageSize)
  }
  const cached = unstable_cache(
    () => fetchNomads(filters, page, pageSize),
    [
      'explore',
      filters?.country ?? '',
      filters?.sortBy ?? 'recent',
      filters?.coffee ? 'coffee' : '',
      filters?.work ? 'work' : '',
      String(page),
      String(pageSize),
    ],
    // 120s TTL backstop; the `explore` tag is bumped on signup / profile edit
    // (lib/revalidate.ts) so new and changed cards surface promptly.
    { tags: ['explore'], revalidate: 120 },
  )
  return cached()
}

async function fetchNomads(
  filters?: { search?: string; country?: string; sortBy?: SortKey; coffee?: boolean; work?: boolean },
  page: number = 1,
  pageSize: number = 24
): Promise<NomadsResult> {
  try {
    const env = await import('@/lib/env').then((m) => m.getEnvSafe())
    if (env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
      return { nomads: [], totalPages: 0, currentPage: page, total: 0 }
    }

    const supabase = createPublicSupabase()
    let query = supabase
      .from('users')
      .select(
        // country added so the summary card can show the actual flag for
        // the user's current_city (matches the public card's new flag
        // fallback). visited_countries_count is the generated column from
        // migration 0025 — drives the "sort by countries" path below.
        // presence_confirmed_at + open_to_coffee added for the "now" layer:
        // they drive the "active now" sort, the coffee filter, and the
        // freshness / coffee chips on the summary card (migrations 0028 / 0024).
        'id, handle, display_name, avatar_url, bio, role, current_city, country, timezone, visited_countries, visited_countries_count, created_at, presence_confirmed_at, open_to_coffee, availability',
        { count: 'exact' },
      )
      // Keep moderated (suspended) cards out of the public directory — their
      // /[handle] page already 404s, so listing them would link to nowhere.
      .eq('suspended', false)

    if (filters?.search) {
      // Strip characters that have meaning in PostgREST's `or` filter
      // grammar — comma separates filters, parens group them, quotes wrap
      // values. Without this, a search term containing any of these breaks
      // the filter syntax (the search just silently misbehaves, not a
      // data-exposure issue since RLS still applies). Also cap length so a
      // pathological term can't blow up the query.
      const safe = filters.search.replace(/[,()"\\]/g, '').slice(0, 100)
      if (safe) {
        query = query.or(
          `handle.ilike.%${safe}%,display_name.ilike.%${safe}%,bio.ilike.%${safe}%,current_city.ilike.%${safe}%`,
        )
      }
    }
    if (filters?.country) {
      // visited_countries is TEXT[] in Postgres; cs = contains
      query = query.contains('visited_countries', [filters.country])
    }
    if (filters?.coffee) {
      // "Around right now and up for coffee" — opted into coffee AND confirmed
      // presence within the freshness window. Served by the partial index
      // idx_users_presence_confirmed_at (WHERE open_to_coffee = TRUE) from 0028.
      const sinceIso = new Date(Date.now() - COFFEE_FRESH_DAYS * 86_400_000).toISOString()
      query = query.eq('open_to_coffee', true).gte('presence_confirmed_at', sinceIso)
    }
    if (filters?.work) {
      // "Open for client work, right now" — availability = 'open' AND a fresh
      // presence claim. Served by the partial index idx_users_availability_open
      // (WHERE availability = 'open') from migration 0031.
      const sinceIso = new Date(Date.now() - WORK_FRESH_DAYS * 86_400_000).toISOString()
      query = query.eq('availability', 'open').gte('presence_confirmed_at', sinceIso)
    }

    // All three sorts are now DB-level. The "countries" sort previously ran
    // client-side post-fetch and only re-ordered the current page's 24
    // rows — meaningless across pages. Migration 0025 added a
    // generated/indexed visited_countries_count column so we can order the
    // full result set properly.
    if (filters?.sortBy === 'countries') {
      query = query.order('visited_countries_count', { ascending: false, nullsFirst: false })
    } else if (filters?.sortBy === 'alpha') {
      query = query.order('display_name', { ascending: true, nullsFirst: false })
    } else if (filters?.sortBy === 'active') {
      // "Active now" — most recently confirmed presence first. nullsFirst:false
      // pushes legacy rows that never stamped to the bottom. Secondary order by
      // created_at keeps it deterministic when timestamps tie (e.g. backfilled).
      query = query
        .order('presence_confirmed_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) throw error

    return {
      nomads: (data ?? []) as Nomad[],
      totalPages: Math.ceil((count || 0) / pageSize),
      currentPage: page,
      total: count || 0,
    }
  } catch {
    return { nomads: [], totalPages: 0, currentPage: page, total: 0 }
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('explore')
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    openGraph: {
      title: t('metaTitle'),
      description: t('metaOgDescription'),
      type: 'website',
      siteName: 'Nomad.now',
    },
    twitter: {
      card: 'summary_large_image',
      title: t('metaTitle'),
      description: t('metaOgDescription'),
    },
    robots: { index: true, follow: true },
  }
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; country?: string; sortBy?: string; coffee?: string; work?: string; page?: string }>
}) {
  const params = await searchParams
  const sortBy: SortKey = (['recent', 'countries', 'alpha', 'active'] as const).includes(params.sortBy as SortKey)
    ? (params.sortBy as SortKey)
    : 'recent'
  const coffee = params.coffee === '1'
  const work = params.work === '1'
  const filters = { search: params.search, country: params.country, sortBy, coffee, work }
  const page = parseInt(params.page || '1', 10)

  const data = await getNomads(filters, page, 24)
  const t = await getTranslations('explore')
  const tNav = await getTranslations('nav')

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Map link hidden until /map feels populated. */}
            <LanguageSwitcher className="hidden sm:inline-flex" />
            <Link
              href="/create-card"
              className="text-sm font-medium bg-gray-900 text-white px-4 py-2 rounded-full hover:bg-gray-800 transition"
            >
              {tNav('getCard')}
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <header className="mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-2">
            {t('title')}
          </h1>
          <p className="text-gray-600">
            {t('subtitle')}
          </p>
        </header>

        <ExploreClient
          nomads={data.nomads}
          initialFilters={filters}
          pagination={{
            currentPage: data.currentPage,
            totalPages: data.totalPages,
            total: data.total,
          }}
        />

        {data.nomads.length === 0 && (
          <EmptyState
            title={t('emptyTitle')}
            description={t('emptyDescription')}
            action={{ label: tNav('getCard'), href: '/create-card' }}
          />
        )}
      </main>
    </div>
  )
}
