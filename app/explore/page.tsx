import React from 'react'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { createServerSupabase } from '@/lib/supabase/server'
import ExploreClient from '@/components/ExploreClient'
import { EmptyState } from '@/components/EmptyState'
import { Logo } from '@/components/Logo'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import type { Metadata } from 'next'

type SortKey = 'recent' | 'countries' | 'alpha'

async function getNomads(
  filters?: { search?: string; country?: string; sortBy?: SortKey },
  page: number = 1,
  pageSize: number = 24
) {
  try {
    const env = await import('@/lib/env').then((m) => m.getEnvSafe())
    if (env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
      return { nomads: [], totalPages: 0, currentPage: page, total: 0 }
    }

    const supabase = await createServerSupabase()
    let query = supabase
      .from('users')
      .select('id, handle, display_name, avatar_url, bio, role, current_city, timezone, visited_countries, created_at', { count: 'exact' })

    if (filters?.search) {
      query = query.or(
        `handle.ilike.%${filters.search}%,display_name.ilike.%${filters.search}%,bio.ilike.%${filters.search}%,current_city.ilike.%${filters.search}%`
      )
    }
    if (filters?.country) {
      // visited_countries is TEXT[] in Postgres; cs = contains
      query = query.contains('visited_countries', [filters.country])
    }

    // Server-side ordering for keys Postgres can handle. "countries" sort is done
    // client-side after fetch because the array-length sort needs a computed column.
    if (filters?.sortBy === 'alpha') {
      query = query.order('display_name', { ascending: true, nullsFirst: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) throw error

    let nomads = data ?? []
    if (filters?.sortBy === 'countries') {
      nomads = [...nomads].sort(
        (a, b) => (b.visited_countries?.length ?? 0) - (a.visited_countries?.length ?? 0)
      )
    }

    return {
      nomads,
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
  searchParams: Promise<{ search?: string; country?: string; sortBy?: string; page?: string }>
}) {
  const params = await searchParams
  const sortBy: SortKey = (['recent', 'countries', 'alpha'] as const).includes(params.sortBy as SortKey)
    ? (params.sortBy as SortKey)
    : 'recent'
  const filters = { search: params.search, country: params.country, sortBy }
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
            <Link
              href="/map"
              className="hidden sm:inline-block text-sm text-gray-600 hover:text-gray-900 px-3 py-2 transition"
            >
              {tNav('map')}
            </Link>
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
