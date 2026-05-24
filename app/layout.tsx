import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages, getTranslations } from 'next-intl/server'
import './globals.css'
import { PerformanceMonitor } from '@/components/PerformanceMonitor'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const OG_LOCALE: Record<string, string> = {
  en: 'en_US',
  ja: 'ja_JP',
  zh: 'zh_CN',
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata')
  const locale = await getLocale()
  return {
    title: t('title'),
    description: t('description'),
    keywords: ['digital nomad', 'nomad profile', 'bio link', 'travel map', 'remote work'],
    authors: [{ name: 'Nomad.now' }],
    openGraph: {
      title: t('title'),
      description: t('ogDescription'),
      type: 'website',
      locale: OG_LOCALE[locale] || 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('ogDescription'),
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} data-scroll-behavior="smooth" className={inter.variable}>
      <body className="antialiased font-sans">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
        <PerformanceMonitor />
      </body>
    </html>
  )
}
