'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

interface Props {
  // Accent hex from the active theme — the button borrows it so it reads as a
  // deliberate, on-brand affordance rather than a generic grey link.
  accentHex: string
}

// Owner-only "I'm still here" tap, shown under the location when the presence
// claim has gone stale (see lib/presence.ts + the location renderer). One POST,
// no body — it stamps presence_confirmed_at = now() server-side and refreshes
// the route so the staleness fade and the "updated N ago" line update in place.
export function ConfirmPresenceButton({ accentHex }: Props) {
  const t = useTranslations('card')
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const handleConfirm = async () => {
    if (pending) return
    setPending(true)
    try {
      const res = await fetch('/api/users/confirm-presence', { method: 'POST' })
      if (res.ok) {
        // Server component re-render picks up the fresh timestamp; no optimistic
        // state needed since the whole card is server-rendered.
        router.refresh()
      }
    } catch {
      // Network blip — leave the button enabled so the user can retry.
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleConfirm}
      disabled={pending}
      className="mt-1 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition hover:opacity-100 opacity-80 disabled:opacity-50 touch-manipulation"
      style={{ borderColor: accentHex, color: accentHex }}
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <span>{t('presence.stillHere')}</span>
    </button>
  )
}
