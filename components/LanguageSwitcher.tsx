'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

const OPTIONS = [
  { code: 'en', labelKey: 'english' },
  { code: 'ja', labelKey: 'japanese' },
  { code: 'zh', labelKey: 'chinese' },
] as const

// One-year cookie. Setting it client-side and then router.refresh() so the
// server re-renders with the new locale. This keeps the URL clean (no /ja/
// prefix) but trades off independent SEO indexing per locale, which we accept
// because /handle profile routes can't share the URL space with locale prefixes.
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const locale = useLocale()
  const t = useTranslations('languageSwitcher')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`
    startTransition(() => router.refresh())
  }

  return (
    <label className={`inline-flex items-center text-sm text-gray-600 ${className}`}>
      <span className="sr-only">{t('label')}</span>
      <span aria-hidden className="mr-1.5" role="img">
        🌐
      </span>
      <select
        value={locale}
        onChange={onChange}
        disabled={isPending}
        className="bg-transparent text-sm text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-0 cursor-pointer disabled:opacity-60 appearance-none pr-1"
      >
        {OPTIONS.map((opt) => (
          <option key={opt.code} value={opt.code}>
            {t(opt.labelKey)}
          </option>
        ))}
      </select>
    </label>
  )
}
