import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { PerformanceMonitor } from '@/components/PerformanceMonitor'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Nomad.now — One page for your nomad life',
  description: 'Where you are. Where you\'ve been. What you\'re building. One link.',
  keywords: ['digital nomad', 'nomad profile', 'bio link', 'travel map', 'remote work', 'currently in', 'where am i'],
  authors: [{ name: 'Nomad.now' }],
  openGraph: {
    title: 'Nomad.now — One page for your nomad life',
    description: 'Where you are. Where you\'ve been. What you\'re building.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nomad.now — One page for your nomad life',
    description: 'Where you are. Where you\'ve been. What you\'re building.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={inter.variable}>
      <body className="antialiased font-sans">
        {children}
        <PerformanceMonitor />
      </body>
    </html>
  )
}
