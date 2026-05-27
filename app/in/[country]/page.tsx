import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { Logo } from '@/components/Logo'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { OptimizedImage } from '@/components/OptimizedImage'
import {
  codeForSlug,
  slugForCountry,
  getCountryName,
  getCountryFlag,
  countries,
} from '@/lib/countries'

// SEO long-tail: one indexable page per country, accessible as /in/portugal,
// /in/thailand, etc. Lists nomads who have set foot in that country.
export const revalidate = 300

interface Nomad {
  id: string
  handle: string
  display_name?: string | null
  avatar_url?: string | null
  bio?: string | null
  role?: string | null
  current_city?: string | null
  // ISO α-2 — drives the flag in each summary card's location row.
  // Matches the public card + /explore summary behavior.
  country?: string | null
  visited_countries?: string[] | null
}

async function getNomadsInCountry(code: string): Promise<Nomad[]> {
  try {
    const env = await import('@/lib/env').then((m) => m.getEnvSafe())
    if (env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) return []

    const supabase = await createServerSupabase()
    const { data, error } = await supabase
      .from('users')
      .select('id, handle, display_name, avatar_url, bio, role, current_city, country, visited_countries')
      .contains('visited_countries', [code])
      .order('created_at', { ascending: false })
      .limit(60)

    if (error) throw error
    return (data ?? []) as Nomad[]
  } catch {
    return []
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string }>
}): Promise<Metadata> {
  const { country: slug } = await params
  const code = codeForSlug(slug)
  const t = await getTranslations('inCountry')
  if (!code) {
    return { title: t('metaTitleNotFound') }
  }
  const name = getCountryName(code)
  const flag = getCountryFlag(code)
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://nomad.now')
  const ogImage = `${baseUrl}/og/in/${slug}`
  return {
    title: t('metaTitle', { country: name }),
    description: t('metaDescription', { country: name, flag }),
    alternates: { canonical: `https://nomad.now/in/${slug}` },
    openGraph: {
      title: t('metaOgTitle', { country: name, flag }),
      description: t('metaOgDescription', { country: name }),
      type: 'website',
      siteName: 'Nomad.now',
      images: [{ url: ogImage, width: 1200, height: 630, alt: t('metaOgTitle', { country: name, flag }) }],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('metaOgTitle', { country: name, flag }),
      description: t('metaOgDescription', { country: name }),
      images: [ogImage],
    },
    keywords: [
      `digital nomads in ${name.toLowerCase()}`,
      `${name.toLowerCase()} remote workers`,
      `nomads ${name.toLowerCase()}`,
      'digital nomad',
      'remote work',
    ],
  }
}

// Pre-generate the popular nomad-country pages at build time. New countries
// (not in our 48-country list) still work via on-demand rendering.
export function generateStaticParams() {
  return countries.map((c) => ({ country: slugForCountry(c.code) }))
}

export default async function InCountryPage({
  params,
}: {
  params: Promise<{ country: string }>
}) {
  const { country: slug } = await params
  const code = codeForSlug(slug)
  if (!code) {
    notFound()
  }

  const name = getCountryName(code)
  const flag = getCountryFlag(code)
  const nomads = await getNomadsInCountry(code)
  const t = await getTranslations('inCountry')
  const tNav = await getTranslations('nav')
  const tFooter = await getTranslations('footer')

  // JSON-LD for a place-collection page so search engines understand the entity.
  // Kept in English for crawler stability — they don't care about UI locale.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Nomads in ${name}`,
    description: `Digital nomads who have set foot in ${name}.`,
    about: { '@type': 'Country', name },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: nomads.length,
      itemListElement: nomads.slice(0, 20).map((n, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Person',
          name: n.display_name || n.handle,
          url: `https://nomad.now/${n.handle}`,
        },
      })),
    },
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Map and Explore links hidden until those pages feel populated. */}
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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* Breadcrumbs — also lighter SEO. */}
        <nav className="text-xs text-gray-500 mb-6 flex items-center gap-2" aria-label="Breadcrumb">
          <Link href="/map" className="hover:text-gray-900 transition">{t('breadcrumbMap')}</Link>
          <span aria-hidden>›</span>
          <span className="text-gray-700">{name}</span>
        </nav>

        <header className="mb-10 sm:mb-14 max-w-3xl">
          <div className="text-6xl sm:text-7xl mb-5 leading-none" aria-hidden>{flag}</div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tighter leading-[1.05] mb-3">
            {t.rich('title', {
              country: name,
              gray: (chunks) => <span className="text-gray-400">{chunks}</span>,
            })}
          </h1>
          <p className="text-lg text-gray-600 max-w-xl">
            {nomads.length === 0
              ? t('subtitleEmpty')
              : nomads.length === 1
              ? t('subtitleHasOne', { count: nomads.length, country: name })
              : t('subtitleHasMany', { count: nomads.length, country: name })}
          </p>
        </header>

        {nomads.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {nomads.map((nomad) => (
              <Link
                key={nomad.id}
                href={`/${nomad.handle}`}
                className="group block bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-md transition"
              >
                <div className="flex items-start gap-3 mb-3">
                  {nomad.avatar_url ? (
                    <OptimizedImage
                      src={nomad.avatar_url}
                      alt={nomad.display_name || nomad.handle}
                      width={48}
                      height={48}
                      className="w-12 h-12 rounded-full object-cover border border-gray-100"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-base font-semibold text-gray-600">
                      {(nomad.display_name || nomad.handle).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-semibold text-gray-900 truncate">
                      {nomad.display_name || nomad.handle}
                    </h2>
                    <div className="text-xs text-gray-500 truncate">
                      @{nomad.handle}
                      {nomad.role && <span className="text-gray-400"> · {nomad.role}</span>}
                    </div>
                  </div>
                </div>
                {nomad.current_city && (
                  <div className="text-sm text-gray-700 mb-2">
                    <span aria-hidden>
                      {nomad.country ? getCountryFlag(nomad.country) : '📍'}
                    </span>{' '}
                    {nomad.current_city}
                  </div>
                )}
                {nomad.bio && (
                  <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{nomad.bio}</p>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-200 p-10 sm:p-14 bg-gray-50/40 text-center">
            <div className="text-5xl mb-4" aria-hidden>{flag}</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('emptyTitle')}</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {t('emptyBody', { country: name })}
            </p>
            <Link
              href="/create-card"
              className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-full font-medium hover:bg-gray-800 transition"
            >
              {tNav('getCard')}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        )}

        <section className="mt-16 sm:mt-20 text-center">
          <Link
            href="/map"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition"
          >
            {t('backToMap')}
          </Link>
        </section>
      </main>

      <footer className="border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <p>{tFooter('copyright')}</p>
          <div className="flex items-center gap-6 flex-wrap">
            <Link href="/create-card" className="hover:text-gray-900 transition">{tNav('getCard')}</Link>
            <LanguageSwitcher />
          </div>
        </div>
      </footer>
    </div>
  )
}
