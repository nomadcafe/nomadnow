'use client'

import { useEffect } from 'react'

// Warns before the user abandons unsaved edits. Two escape routes to cover,
// because the edit form lives at /edit/content while the surrounding chrome
// (tabs, "View profile", logo) navigates with Next <Link> — client-side:
//   1. Browser unload (refresh / close / external URL) → beforeunload.
//   2. Same-tab in-app navigation (an <a> click) → a capture-phase click
//      listener that runs before Next's Link handler, so cancelling actually
//      stops the route change.
// Active only while `active` is true (i.e. the form is dirty and not mid-save).
export function useUnsavedChanges(active: boolean, message: string) {
  useEffect(() => {
    if (!active) return

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // Modern browsers ignore custom text and show their own prompt, but
      // setting returnValue is still required to trigger it.
      e.returnValue = ''
    }

    const onClickCapture = (e: MouseEvent) => {
      // Respect anything already handled, and only intercept a plain
      // left-click — modified clicks (new tab/window) don't lose the form.
      if (e.defaultPrevented || e.button !== 0) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

      const anchor = (e.target as HTMLElement | null)?.closest?.('a')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href) return
      // Skip new-tab / download / non-navigations.
      const target = anchor.getAttribute('target')
      if (target && target !== '_self') return
      if (anchor.hasAttribute('download')) return

      let url: URL
      try {
        url = new URL(href, window.location.href)
      } catch {
        return
      }
      if (url.origin !== window.location.origin) return
      // Same page (pure hash change or no-op) isn't a real exit.
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return
      }

      if (!window.confirm(message)) {
        // Capture phase + stopPropagation means Next's Link onClick never
        // fires, so the SPA navigation is cancelled outright.
        e.preventDefault()
        e.stopPropagation()
      }
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('click', onClickCapture, true)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('click', onClickCapture, true)
    }
  }, [active, message])
}
