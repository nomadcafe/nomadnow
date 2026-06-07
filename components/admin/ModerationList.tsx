'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ReportReason, ReportStatus } from '@/types/database'

export interface ModerationRow {
  id: string
  handle: string
  reason: ReportReason
  details: string | null
  status: ReportStatus
  createdAt: string
  // undefined when no live user row exists for the handle (deleted/renamed).
  suspended?: boolean
}

const REASON_COLOR: Record<ReportReason, string> = {
  phishing: 'bg-red-100 text-red-700',
  malware: 'bg-red-100 text-red-700',
  impersonation: 'bg-amber-100 text-amber-700',
  spam: 'bg-gray-100 text-gray-600',
  other: 'bg-gray-100 text-gray-600',
}

export function ModerationList({ initialRows }: { initialRows: ModerationRow[] }) {
  // Track the live suspended state per handle so toggling one report's button
  // updates every report that points at the same handle.
  const [suspendedByHandle, setSuspendedByHandle] = useState<Record<string, boolean | undefined>>(
    () => {
      const m: Record<string, boolean | undefined> = {}
      for (const r of initialRows) m[r.handle] = r.suspended
      return m
    },
  )
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function toggle(handle: string, next: boolean) {
    setBusy(handle)
    setError(null)
    try {
      const res = await fetch('/api/admin/suspend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle, suspended: next }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Request failed (${res.status})`)
      }
      // Optimistic update for instant feedback, then refresh so the report
      // status pills re-render from the server's new actioned/dismissed state.
      setSuspendedByHandle((prev) => ({ ...prev, [handle]: next }))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update')
    } finally {
      setBusy(null)
    }
  }

  if (initialRows.length === 0) {
    return <p className="text-sm text-gray-500">No reports yet.</p>
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
          {error}
        </div>
      )}
      {initialRows.map((r) => {
        const suspended = suspendedByHandle[r.handle]
        const exists = suspended !== undefined
        const isBusy = busy === r.handle
        return (
          <div
            key={r.id}
            className="flex items-start justify-between gap-4 bg-white border border-gray-200 rounded-xl px-4 py-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={`/${r.handle}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-sm font-medium text-gray-900 hover:underline"
                >
                  /{r.handle}
                </a>
                <span className={`text-xs px-2 py-0.5 rounded-full ${REASON_COLOR[r.reason]}`}>
                  {r.reason}
                </span>
                <span className="text-xs text-gray-400">{r.status}</span>
                {suspended === true && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-600 text-white">suspended</span>
                )}
              </div>
              {r.details && <p className="text-sm text-gray-600 mt-1 break-words">{r.details}</p>}
              <p className="text-xs text-gray-400 mt-1">{new Date(r.createdAt).toLocaleString()}</p>
            </div>
            <div className="shrink-0">
              {!exists ? (
                <span className="text-xs text-gray-400">no live card</span>
              ) : suspended ? (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => toggle(r.handle, false)}
                  className="text-sm px-3 py-1.5 rounded-full border border-gray-300 text-gray-700 hover:border-gray-900 transition disabled:opacity-50"
                >
                  {isBusy ? '…' : 'Unsuspend'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => toggle(r.handle, true)}
                  className="text-sm px-3 py-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
                >
                  {isBusy ? '…' : 'Suspend'}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
