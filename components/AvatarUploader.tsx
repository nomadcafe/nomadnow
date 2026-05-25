'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

const MAX_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

// Avatar widget that replaces the old "paste a URL" input. Uploads the
// selected file to /api/avatar/upload (which writes to Supabase Storage)
// and bubbles the resulting public URL up to the parent form.
//
// Validation runs once on the client for fast feedback and again on the
// server (single source of truth). The native file picker is hidden — we
// trigger it from a styled <button> so the control looks like the rest of
// the form instead of a default OS file input.
export function AvatarUploader({
  value,
  onChange,
}: {
  value: string
  onChange: (url: string) => void
}) {
  const t = useTranslations('createCard.avatar')
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    if (file.size > MAX_SIZE_BYTES) {
      setError(t('tooLarge'))
      return
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(t('badType'))
      return
    }

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/avatar/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok || !data.url) {
        if (data.code === 'TOO_LARGE') throw new Error(t('tooLarge'))
        if (data.code === 'BAD_TYPE') throw new Error(t('badType'))
        throw new Error(data.error || t('uploadFailed'))
      }
      onChange(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('uploadFailed'))
    } finally {
      setUploading(false)
      // Reset so selecting the same file twice re-fires onChange.
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center border border-gray-200 shrink-0">
          {value ? (
            // Intentionally a plain <img>, not next/image — value is a
            // Supabase Storage URL whose host doesn't need next.config
            // remotePatterns entry and we don't want LCP weight here.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_TYPES.join(',')}
            onChange={onSelect}
            className="sr-only"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="text-sm font-medium px-3 py-2 rounded-full border border-gray-300 hover:border-gray-900 transition disabled:opacity-60 disabled:cursor-wait"
            >
              {uploading ? t('uploading') : value ? t('replace') : t('upload')}
            </button>
            {value && !uploading && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="text-sm font-medium px-3 py-2 rounded-full text-gray-500 hover:text-red-600 transition"
              >
                {t('remove')}
              </button>
            )}
          </div>
          <p className="mt-1.5 text-xs text-gray-500">{t('hint')}</p>
        </div>
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
