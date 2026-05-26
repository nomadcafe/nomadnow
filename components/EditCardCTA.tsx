'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'

// Floating CTA shown to the card owner when they view their own /{handle}
// page. Mirrors MakeYoursCTA visually so the corner placement is consistent
// across viewer/owner perspectives — the owner sees "Edit your card" → /edit
// (unified tab shell) instead of the visitor-targeted "Make yours" promo.
export function EditCardCTA() {
  const t = useTranslations('editCardCTA')
  return (
    <Link
      href="/edit"
      className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-lg ring-1 ring-black/5 hover:bg-gray-800 transition focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
      aria-label={t('aria')}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
      <span>{t('cta')}</span>
    </Link>
  )
}
