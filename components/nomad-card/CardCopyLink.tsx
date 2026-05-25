'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

interface Props {
  handle: string
  mutedClass: string
}

// Share-row link + copy button. Lifted out of NomadCard so the parent can
// render server-side — clipboard state and the copied-feedback timer are
// the only reason this part needs to be client-side.
export function CardCopyLink({ handle, mutedClass }: Props) {
  const t = useTranslations('card')
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const url = `https://nomad.now/${handle}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API can fail on insecure origins; degrade silently.
    }
  }

  return (
    <div className="flex items-center justify-center gap-2">
      <Link
        href={`https://nomad.now/${handle}`}
        className={`text-sm font-mono ${mutedClass} hover:opacity-100 opacity-80 transition`}
      >
        nomad.now/{handle}
      </Link>
      <button
        onClick={handleCopy}
        className={`p-2 sm:p-2.5 transition relative touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center opacity-60 hover:opacity-100 ${mutedClass}`}
        aria-label={t('copyLink')}
        title={copied ? t('copied') : t('copyLink')}
      >
        {copied ? (
          <svg
            className="w-4 h-4 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        )}
      </button>
    </div>
  )
}
