'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

// Celebratory share banner shown right after /create-card finishes. The
// parent decides when to mount this (gated on ?celebrate=1 server-side),
// so the JS only ships during that one high-attention moment — repeat
// visitors never download the bundle.
//
// Auto-dismisses after 8 seconds and can be closed manually.
export function CelebrationBanner({ handle }: { handle: string }) {
  const t = useTranslations('celebrate')
  const [visible, setVisible] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 8000)
    return () => window.clearTimeout(timer)
  }, [])

  if (!visible) return null

  // Resolve URL client-side so dev/staging hosts get the right link.
  const url =
    typeof window !== 'undefined'
      ? `${window.location.origin}/${handle}`
      : `https://nomad.now/${handle}`

  const tweetText = t('tweetTemplate', { url })
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API can fail on insecure origins; degrade gracefully.
    }
  }

  return (
    <div className="fixed top-0 inset-x-0 z-[60] pointer-events-none">
      <div className="pointer-events-auto bg-gradient-to-r from-amber-100 via-orange-50 to-amber-100 border-b border-amber-200 shadow-lg">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-2xl leading-none" aria-hidden>🎉</span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">{t('title')}</div>
              <div className="text-xs text-gray-600 hidden sm:block">{t('subtitle')}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={tweetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-gray-900 text-white hover:bg-gray-800 transition"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span className="hidden sm:inline">{t('shareX')}</span>
            </a>
            <a
              href={linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-white border border-gray-300 hover:border-gray-900 text-gray-900 transition"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065c0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              <span className="hidden sm:inline">{t('shareLinkedin')}</span>
            </a>
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-white border border-gray-300 hover:border-gray-900 text-gray-900 transition"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="hidden sm:inline">{t('copied')}</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="hidden sm:inline">{t('copyLink')}</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setVisible(false)}
              className="p-1.5 text-gray-500 hover:text-gray-900 transition"
              aria-label={t('dismiss')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
