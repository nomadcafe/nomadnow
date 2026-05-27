'use client'

import React, { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { OptimizedImage } from './OptimizedImage'
import { Pagination } from './Pagination'
import { debounce } from '@/lib/debounce'
import { getCountryFlag } from '@/lib/countries'

interface Nomad {
  id: string
  handle: string
  display_name?: string
  avatar_url?: string
  bio?: string
  role?: string
  current_city?: string
  // ISO α-2 derived when the user picked an autocomplete suggestion for
  // current_city. Drives the flag in the summary card's location row —
  // matches the public card's behavior. Empty for users who typed their
  // city manually before the autocomplete upgrade.
  country?: string
  timezone?: string
  visited_countries?: string[]
  created_at?: string
}

interface ExploreClientProps {
  nomads: Nomad[]
  initialFilters: {
    search?: string
    country?: string
    sortBy?: string
  }
  pagination?: {
    currentPage: number
    totalPages: number
    total: number
  }
}

const SORT_KEYS = [
  { value: 'recent', labelKey: 'sortRecent' },
  { value: 'countries', labelKey: 'sortCountries' },
  { value: 'alpha', labelKey: 'sortAlpha' },
] as const

export default function ExploreClient({
  nomads,
  initialFilters,
  pagination,
}: ExploreClientProps) {
  const t = useTranslations('explore')
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(initialFilters.search || '')
  const [sortBy, setSortBy] = useState(initialFilters.sortBy || 'recent')

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (key !== 'page') params.delete('page')
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`/explore?${params.toString()}`)
  }

  const handlePageChange = (page: number) => {
    handleFilterChange('page', String(page))
  }

  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        if (value !== initialFilters.search) {
          handleFilterChange('search', value)
        }
      }, 400),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  useEffect(() => {
    if (search.length >= 2 || search.length === 0) {
      debouncedSearch(search)
    }
  }, [search, debouncedSearch])

  return (
    <>
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 text-sm bg-white"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value)
            handleFilterChange('sortBy', e.target.value)
          }}
          className="px-4 py-2.5 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 text-sm bg-white"
        >
          {SORT_KEYS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {t('sortPrefix')} {t(opt.labelKey)}
            </option>
          ))}
        </select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {nomads.map((nomad) => (
          <NomadCardSummary key={nomad.id} nomad={nomad} />
        ))}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-10">
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
          <div className="text-center text-xs text-gray-500 mt-4">
            {t('paginationOf', {
              from: (pagination.currentPage - 1) * 24 + 1,
              to: Math.min(pagination.currentPage * 24, pagination.total),
              total: pagination.total,
            })}
          </div>
        </div>
      )}
    </>
  )
}

function NomadCardSummary({ nomad }: { nomad: Nomad }) {
  const tCard = useTranslations('card')
  const tRole = useTranslations('roles')
  const countries = nomad.visited_countries ?? []
  const localTime = useClientLocalTime(nomad.timezone)
  const initial = (nomad.display_name || nomad.handle).charAt(0).toUpperCase()
  // Localise the role label only if it matches a known slug; otherwise show raw.
  const localisedRole = (raw?: string) => {
    if (!raw) return raw
    try {
      const v = tRole(raw)
      return v === raw ? raw : v
    } catch {
      return raw
    }
  }

  return (
    <Link
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
            {initial}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-gray-900 truncate">
            {nomad.display_name || nomad.handle}
          </h2>
          <div className="text-xs text-gray-500 truncate">
            @{nomad.handle}
            {nomad.role && <span className="text-gray-400"> · {localisedRole(nomad.role)}</span>}
          </div>
        </div>
      </div>

      {nomad.current_city && (
        <div className="text-sm text-gray-700 mb-3 flex items-center gap-1">
          <span aria-hidden>{nomad.country ? getCountryFlag(nomad.country) : '📍'}</span>
          <span className="font-medium">{nomad.current_city}</span>
          {localTime && (
            <span className="text-gray-400 font-mono tabular-nums text-xs">· {localTime}</span>
          )}
        </div>
      )}

      {nomad.bio && (
        <p className="text-sm text-gray-600 line-clamp-2 mb-3 leading-relaxed">{nomad.bio}</p>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs">
        <div className="flex items-center gap-1 text-gray-600">
          <span className="font-semibold tabular-nums text-gray-900">{countries.length}</span>
          <span className="text-gray-500">{countries.length === 1 ? tCard('countryOne') : tCard('countryMany')}</span>
        </div>
        <div className="flex items-center gap-0.5 text-base leading-none">
          {countries.slice(0, 5).map((c) => (
            <span key={c} title={c}>{getCountryFlag(c)}</span>
          ))}
          {countries.length > 5 && (
            <span className="text-xs text-gray-400 ml-1">+{countries.length - 5}</span>
          )}
        </div>
      </div>
    </Link>
  )
}

function useClientLocalTime(timezone?: string) {
  const [time, setTime] = useState<string | null>(null)
  useEffect(() => {
    if (!timezone) return
    function tick() {
      try {
        setTime(
          new Date().toLocaleTimeString('en-US', {
            timeZone: timezone,
            hour: 'numeric',
            minute: '2-digit',
            hour12: false,
          })
        )
      } catch {
        setTime(null)
      }
    }
    tick()
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [timezone])
  return time
}
