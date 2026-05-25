'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Logo } from './Logo'
import { LanguageSwitcher } from './LanguageSwitcher'
import { isReservedHandle } from '@/lib/reserved-handles'
import { handleSchema } from '@/lib/validation'

interface ProfileNotFoundProps {
  handle: string
}

// What we show when /{handle} doesn't resolve to a real profile.
// Distinguishes three cases and steers the visitor toward action:
//   1. Handle format is invalid → educate
//   2. Handle is reserved → polite refusal
//   3. Handle is available → big "Claim this" CTA (this is the conversion path
//      for anyone who clicked an aspirational / dead link)
export function ProfileNotFound({ handle }: ProfileNotFoundProps) {
  const t = useTranslations('profileNotFound')
  const tNav = useTranslations('nav')
  const lower = handle.toLowerCase()
  const validFormat = handleSchema.safeParse(lower).success
  const reserved = isReservedHandle(lower)

  let state: 'invalid' | 'reserved' | 'available'
  if (!validFormat) state = 'invalid'
  else if (reserved) state = 'reserved'
  else state = 'available'

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <nav className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Map and Explore hidden until they feel populated. */}
            <LanguageSwitcher className="hidden sm:inline-flex" />
          </div>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center">
          {state === 'available' && (
            <>
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                {t('availableBadge')}
              </div>
              <h1 className="text-4xl sm:text-5xl font-semibold tracking-tighter leading-[1.05] mb-4">
                <span className="text-gray-300">nomad.now/</span>
                <span className="break-all">{lower}</span>
              </h1>
              <p className="text-gray-600 mb-10 text-lg leading-relaxed">
                {t('availableBody')}
              </p>
              <Link
                href={`/create-card?handle=${encodeURIComponent(lower)}`}
                className="inline-flex items-center gap-2 bg-gray-900 text-white px-7 py-4 rounded-full font-medium hover:bg-gray-800 transition shadow-lg shadow-gray-900/10"
              >
                {t('availableCta', { handle: lower })}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <div className="mt-5 text-xs text-gray-500">
                {t('availableNote')}
              </div>
            </>
          )}

          {state === 'reserved' && (
            <>
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {t('reservedBadge')}
              </div>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
                <span className="text-gray-300">nomad.now/</span>
                <span className="break-all">{lower}</span>
              </h1>
              <p className="text-gray-600 mb-8 leading-relaxed">
                {t('reservedBody')}
              </p>
              <Link
                href="/create-card"
                className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-full font-medium hover:bg-gray-800 transition"
              >
                {t('reservedCta')}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </>
          )}

          {state === 'invalid' && (
            <>
              <div className="mb-6">
                <svg
                  className="w-16 h-16 mx-auto text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight mb-3">{t('invalidTitle')}</h1>
              <p className="text-gray-600 mb-8 leading-relaxed">
                {t('invalidBody')}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/create-card"
                  className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-full font-medium hover:bg-gray-800 transition"
                >
                  {t('invalidPick')}
                </Link>
                <Link
                  href="/explore"
                  className="inline-flex items-center justify-center gap-2 bg-white text-gray-700 px-6 py-3 rounded-full font-medium border border-gray-200 hover:bg-gray-50 transition"
                >
                  {t('invalidExplore')}
                </Link>
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-center text-xs text-gray-400">
          {t('footer')}
        </div>
      </footer>
    </div>
  )
}
