import { getRequestConfig } from 'next-intl/server'
import { cookies, headers } from 'next/headers'

// Locales the UI is translated into. The first entry is treated as the default
// when the cookie is missing and the Accept-Language header doesn't match.
export const LOCALES = ['en', 'ja', 'zh'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'en'

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  ja: '日本語',
  zh: '中文',
}

function negotiateFromHeader(accept: string | null): Locale {
  if (!accept) return DEFAULT_LOCALE
  // Cheap negotiation: scan in order of declared q-priority. next-intl ships
  // its own negotiator but we don't need full RFC compliance for 3 locales.
  const ordered = accept
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=')
      return { tag: tag.toLowerCase(), q: q ? parseFloat(q) : 1 }
    })
    .sort((a, b) => b.q - a.q)

  for (const { tag } of ordered) {
    if (tag.startsWith('ja')) return 'ja'
    if (tag.startsWith('zh')) return 'zh'
    if (tag.startsWith('en')) return 'en'
  }
  return DEFAULT_LOCALE
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value as Locale | undefined

  let locale: Locale
  if (cookieLocale && (LOCALES as readonly string[]).includes(cookieLocale)) {
    locale = cookieLocale
  } else {
    const h = await headers()
    locale = negotiateFromHeader(h.get('accept-language'))
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
