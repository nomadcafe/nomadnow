import Link from 'next/link'
import type { Metadata } from 'next'
import { createServerSupabase } from '@/lib/supabase/server'
import { WorldMap } from '@/components/WorldMap'
import { Logo } from '@/components/Logo'
import { countries, getCountryFlag, getCountryName, slugForCountry } from '@/lib/countries'
import { EmptyState } from '@/components/EmptyState'

export const metadata: Metadata = {
  title: 'The nomad map — where everyone\'s been',
  description: 'See every country digital nomads on Nomad.now have set foot in, ranked by how active each one is. A live constellation of remote work.',
  openGraph: {
    title: 'The nomad map — Nomad.now',
    description: 'See every country digital nomads have visited. A live constellation of remote work.',
    type: 'website',
    siteName: 'Nomad.now',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The nomad map — Nomad.now',
    description: 'See every country digital nomads have visited.',
  },
}

// Revalidate at most every 5 minutes — aggregate counts are not real-time critical.
export const revalidate = 300

interface Aggregate {
  weights: Record<string, number>
  totalNomads: number
  countriesCovered: number
  totalVisits: number
}

async function getAggregate(): Promise<Aggregate> {
  const empty: Aggregate = { weights: {}, totalNomads: 0, countriesCovered: 0, totalVisits: 0 }
  try {
    const env = await import('@/lib/env').then((m) => m.getEnvSafe())
    if (env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) return empty

    // Select only what we need. visited_countries is TEXT[] — we'll aggregate in app code.
    // For thousands of users this should move to a SQL aggregate (count + GROUP BY unnest),
    // but for the foreseeable future doing it in JS keeps things simple and migration-free.
    const supabase = await createServerSupabase()
    const { data, error } = await supabase
      .from('users')
      .select('visited_countries')
      .not('visited_countries', 'is', null)

    if (error) throw error

    const weights: Record<string, number> = {}
    let totalVisits = 0
    let totalNomads = 0

    for (const row of data ?? []) {
      const codes = (row.visited_countries as string[] | null) ?? []
      if (codes.length === 0) continue
      totalNomads += 1
      for (const code of codes) {
        weights[code] = (weights[code] ?? 0) + 1
        totalVisits += 1
      }
    }

    return {
      weights,
      totalNomads,
      countriesCovered: Object.keys(weights).length,
      totalVisits,
    }
  } catch {
    return empty
  }
}

function formatNumber(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export default async function MapPage() {
  const agg = await getAggregate()
  const isEmpty = agg.totalNomads === 0

  // Top countries by nomad count.
  const topCountries = Object.entries(agg.weights)
    .filter(([code]) => countries.some((c) => c.code === code))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/explore"
              className="hidden sm:inline-block text-sm text-gray-600 hover:text-gray-900 px-3 py-2 transition"
            >
              Explore
            </Link>
            <Link
              href="/create-card"
              className="text-sm font-medium bg-gray-900 text-white px-4 py-2 rounded-full hover:bg-gray-800 transition"
            >
              Get your card
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <header className="mb-10 sm:mb-14 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            The nomad map
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tighter leading-[1.05] mb-4">
            Every country everyone&apos;s been to.
          </h1>
          <p className="text-lg text-gray-600 max-w-xl leading-relaxed">
            A live constellation of where the platform&apos;s nomads have set foot.
            Bigger dot = more people. Click a country to see who&apos;s been there.
          </p>
        </header>

        {/* Stat strip */}
        <div className="grid grid-cols-3 gap-4 sm:gap-8 mb-10 sm:mb-14 py-6 border-y border-gray-100">
          <Stat value={formatNumber(agg.totalNomads)} label="nomads tracked" />
          <Stat value={formatNumber(agg.countriesCovered)} label="countries covered" />
          <Stat value={formatNumber(agg.totalVisits)} label="visits logged" />
        </div>

        {/* The map */}
        {isEmpty ? (
          <div className="rounded-3xl border border-dashed border-gray-200 p-10 sm:p-16 bg-gray-50/40">
            <EmptyState
              title="No nomads on the map yet"
              description="Be the first to claim a card and put a country on the board."
              action={{ label: 'Get your card', href: '/create-card' }}
            />
          </div>
        ) : (
          <div className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-10 shadow-sm">
            <WorldMap weights={agg.weights} />
          </div>
        )}

        {/* Top countries grid */}
        {topCountries.length > 0 && (
          <section className="mt-14 sm:mt-20">
            <div className="flex items-end justify-between flex-wrap gap-3 mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                Where they&apos;re going.
              </h2>
              <Link
                href="/explore"
                className="text-sm text-gray-600 hover:text-gray-900 transition"
              >
                Browse all nomads →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {topCountries.map(([code, count], idx) => (
                <Link
                  key={code}
                  href={`/in/${slugForCountry(code)}`}
                  className="group flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-2xl hover:border-gray-300 hover:shadow-sm transition"
                >
                  <span className="text-2xl leading-none" aria-hidden>
                    {getCountryFlag(code)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {getCountryName(code)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {count} {count === 1 ? 'nomad' : 'nomads'}
                    </div>
                  </div>
                  {idx < 3 && (
                    <span aria-hidden className="text-base">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA strip */}
        <section className="mt-20 sm:mt-28 rounded-3xl bg-gradient-to-br from-gray-50 via-orange-50 to-amber-50 px-6 sm:px-10 py-12 sm:py-16 text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tighter leading-tight mb-3 max-w-xl mx-auto">
            Put your countries on the map.
          </h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Pick the ones you&apos;ve been to. They appear here, on your card, and on your share image.
          </p>
          <Link
            href="/create-card"
            className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-full font-medium hover:bg-gray-800 transition"
          >
            Get your card
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </section>
      </main>

      <footer className="border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <p>© 2026 Nomad.now</p>
          <div className="flex items-center gap-6">
            <Link href="/explore" className="hover:text-gray-900 transition">Explore</Link>
            <Link href="/map" className="hover:text-gray-900 transition">Map</Link>
            <Link href="/create-card" className="hover:text-gray-900 transition">Get your card</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center sm:text-left">
      <div className="text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums">{value}</div>
      <div className="text-xs sm:text-sm text-gray-500 uppercase tracking-wider mt-1">{label}</div>
    </div>
  )
}
