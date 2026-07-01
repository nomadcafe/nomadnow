'use client'

import { useEffect } from 'react'

// Client-side analytics beacon for a public card. Mounted once per card page
// (non-embedded) as a sibling of the server-rendered card markup. It:
//   1. records ONE view per browser session (deduped in sessionStorage), and
//   2. records clicks via event delegation on any <a data-track-type> the
//      server rendered — no per-link client component, no hydration cost on the
//      links themselves.
//
// The owner viewing/clicking their own card is excluded entirely so the stats
// reflect real visitors, not the user QA'ing their page.
//
// Both use navigator.sendBeacon: a click typically navigates the browser away
// immediately, which cancels an in-flight fetch — sendBeacon is queued by the
// browser and delivered regardless. Falls back to fetch(keepalive) where
// sendBeacon is unavailable.

type Payload =
  | { kind: 'view'; handle: string }
  | { kind: 'click'; handle: string; targetType: string; targetUrl: string | null }

function send(payload: Payload) {
  try {
    const body = JSON.stringify(payload)
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/events', new Blob([body], { type: 'application/json' }))
      return
    }
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Analytics must never break the page.
  }
}

export function CardEventTracker({ handle, isOwner = false }: { handle: string; isOwner?: boolean }) {
  useEffect(() => {
    if (isOwner || !handle) return

    // One view per session per handle. Stable key — the earlier ViewCounter
    // bug keyed on Date.now(), so it re-counted on every load and never deduped.
    const viewKey = `nn_view_${handle}`
    try {
      if (!sessionStorage.getItem(viewKey)) {
        send({ kind: 'view', handle })
        sessionStorage.setItem(viewKey, '1')
      }
    } catch {
      // Private-mode / disabled storage: still count the view, just no dedup.
      send({ kind: 'view', handle })
    }

    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null
      const anchor = target?.closest?.('a[data-track-type]') as HTMLAnchorElement | null
      if (!anchor) return
      const targetType = anchor.getAttribute('data-track-type')
      if (!targetType) return
      send({
        kind: 'click',
        handle,
        targetType,
        targetUrl: anchor.getAttribute('data-track-url') || anchor.getAttribute('href') || null,
      })
    }

    // Capture phase so we record even if a handler down-tree calls
    // stopPropagation before the click bubbles up.
    document.addEventListener('click', onClick, { capture: true })
    return () => document.removeEventListener('click', onClick, { capture: true })
  }, [handle, isOwner])

  return null
}
