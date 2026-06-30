'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

const MAX_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

// Background-image widget for the Look tab. Mirrors AvatarUploader but posts
// to the Pro-gated /api/background/upload and previews in a wide rectangle
// (it's a full-bleed page background, not a round avatar). Bubbles the public
// Storage URL up to the form, which stores it as background_value.url.
export function BackgroundUploader({
  value,
  onChange,
}: {
  value: string
  onChange: (url: string) => void
}) {
  const t = useTranslations('settings.background')
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    if (file.size > MAX_SIZE_BYTES) {
      setError(t('imageTooLarge'))
      return
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(t('imageBadType'))
      return
    }

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/background/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok || !data.url) {
        if (data.code === 'TOO_LARGE') throw new Error(t('imageTooLarge'))
        if (data.code === 'BAD_TYPE') throw new Error(t('imageBadType'))
        throw new Error(data.error || t('imageUploadFailed'))
      }
      onChange(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('imageUploadFailed'))
    } finally {
      setUploading(false)
      // Reset so re-selecting the same file re-fires onChange.
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <div
        className="h-32 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center"
        style={
          value ? { backgroundImage: `url("${value}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined
        }
        aria-hidden
      >
        {!value && (
          <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M4 6h16v12H4z" />
          </svg>
        )}
      </div>
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
          {uploading ? t('imageUploading') : value ? t('imageReplace') : t('imageUpload')}
        </button>
        {value && !uploading && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-sm font-medium px-3 py-2 rounded-full text-gray-500 hover:text-red-600 transition"
          >
            {t('imageRemove')}
          </button>
        )}
      </div>
      <p className="text-xs text-gray-500">{t('imageHint')}</p>
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
