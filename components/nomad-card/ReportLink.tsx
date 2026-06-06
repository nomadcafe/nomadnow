'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { ReportReason } from '@/types/database'

interface Props {
  handle: string
  // Footer's muted text class, so the trigger blends into the share row.
  mutedClass: string
}

const REASONS: ReportReason[] = ['phishing', 'malware', 'impersonation', 'spam', 'other']

// Unobtrusive "Report this page" trigger + modal. The dialog is styled neutral
// (white card, dark text) independent of the card theme, since it's an overlay
// rather than part of the card surface. State machine: idle → sending →
// success | error.
export function ReportLink({ handle, mutedClass }: Props) {
  const t = useTranslations('report')
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason>('phishing')
  const [details, setDetails] = useState('')
  // Honeypot — bots fill it, humans never see it. Submitting non-empty makes
  // the server accept-and-drop.
  const [website, setWebsite] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')

  const close = () => {
    setOpen(false)
    // Reset after the modal is gone so a re-open starts clean.
    setStatus('idle')
    setReason('phishing')
    setDetails('')
    setWebsite('')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle, reason, details, website }),
      })
      setStatus(res.ok ? 'success' : 'error')
    } catch {
      setStatus('error')
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`mt-4 text-xs underline-offset-2 hover:underline opacity-60 hover:opacity-100 transition ${mutedClass}`}
      >
        {t('trigger')}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t('title')}
          onClick={close}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 text-gray-900 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {status === 'success' ? (
              <div className="text-center">
                <h2 className="text-lg font-semibold mb-2">{t('successTitle')}</h2>
                <p className="text-sm text-gray-600 mb-5">{t('successBody')}</p>
                <button
                  type="button"
                  onClick={close}
                  className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition"
                >
                  {t('done')}
                </button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <h2 className="text-lg font-semibold mb-1">{t('title')}</h2>
                <p className="text-sm text-gray-500 mb-4">{t('subtitle', { handle })}</p>

                <label className="block text-sm font-medium mb-1.5">{t('reasonLabel')}</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as ReportReason)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-4 bg-white"
                >
                  {REASONS.map((r) => (
                    <option key={r} value={r}>
                      {t(`reasons.${r}`)}
                    </option>
                  ))}
                </select>

                <label className="block text-sm font-medium mb-1.5">{t('detailsLabel')}</label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  maxLength={1000}
                  rows={3}
                  placeholder={t('detailsPlaceholder')}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-4 resize-none"
                />

                {/* Honeypot — hidden from humans, harvested by bots. */}
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="absolute left-[-9999px] h-0 w-0 opacity-0"
                />

                {status === 'error' && (
                  <p className="text-sm text-red-600 mb-3">{t('error')}</p>
                )}

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={close}
                    className="text-sm text-gray-500 hover:text-gray-700 transition"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={status === 'sending'}
                    className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition disabled:opacity-60"
                  >
                    {status === 'sending' ? t('sending') : t('submit')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
