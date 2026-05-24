'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'

// Floating CTA visible on every profile page so visitors can convert into creators.
// Kept small and unobtrusive — main attention belongs to the profile being viewed.
export function MakeYoursCTA() {
  const t = useTranslations('makeYoursCTA')
  return (
    <Link
      href="/create-card"
      className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-lg ring-1 ring-black/5 hover:bg-gray-800 transition focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
      aria-label={t('aria')}
    >
      <span>{t('cta')}</span>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
      </svg>
    </Link>
  )
}
