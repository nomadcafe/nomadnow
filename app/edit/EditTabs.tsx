'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'

// Tab nav shared across /edit/content, /edit/look, /edit/account. Lives in
// the /edit layout so switching tabs preserves the surrounding chrome and
// only rerenders the inner page. usePathname picks the active tab so each
// tab's URL is a real deep link (/edit/look bookmarks land on Look).
const TABS = [
  { id: 'content', href: '/edit/content' },
  { id: 'look', href: '/edit/look' },
  { id: 'account', href: '/edit/account' },
] as const

export function EditTabs() {
  const pathname = usePathname()
  const t = useTranslations('edit.tabs')

  return (
    <div className="border-b border-gray-100 bg-white/80 backdrop-blur sticky top-[57px] sm:top-[65px] z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <nav className="flex gap-1 -mb-px" aria-label="Edit tabs">
          {TABS.map((tab) => {
            const active = pathname === tab.href || pathname?.startsWith(tab.href + '/')
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                  active
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                {t(tab.id)}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
