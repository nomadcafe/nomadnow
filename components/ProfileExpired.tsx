'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Logo } from './Logo'
import { LanguageSwitcher } from './LanguageSwitcher'

// Rendered at /{handle} when the owner's subscription was canceled and the
// paid period has elapsed. Distinct from ProfileNotFound's "available" state
// because the handle is still reserved for the prior owner (30-day window),
// so we don't offer it as claimable here.
export function ProfileExpired({ handle }: { handle: string }) {
  const t = useTranslations('profileExpired')
  const tNav = useTranslations('nav')

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <nav className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/explore"
              className="hidden sm:inline-block text-sm text-gray-600 hover:text-gray-900 px-3 py-2 transition"
            >
              {tNav('explore')}
            </Link>
            <Link
              href="/map"
              className="hidden sm:inline-block text-sm text-gray-600 hover:text-gray-900 px-3 py-2 transition"
            >
              {tNav('map')}
            </Link>
            <LanguageSwitcher className="hidden sm:inline-flex" />
          </div>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center">
          <div className="text-5xl mb-5" aria-hidden>🌙</div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3">
            {t('title')}
          </h1>
          <div className="text-sm text-gray-500 font-mono mb-6">
            nomad.now/{handle}
          </div>
          <p className="text-gray-600 mb-8 leading-relaxed">
            {t('body')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-full font-medium hover:bg-gray-800 transition"
            >
              {t('cta')}
            </Link>
            <Link
              href="/explore"
              className="inline-flex items-center justify-center gap-2 bg-white text-gray-700 px-6 py-3 rounded-full font-medium border border-gray-200 hover:bg-gray-50 transition"
            >
              {t('browse')}
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
