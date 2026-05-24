/**
 * Keyboard shortcuts utilities
 */

export interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
  handler: () => void
}

/**
 * Register keyboard shortcuts
 */
export function registerShortcuts(
  shortcuts: KeyboardShortcut[],
  element?: HTMLElement
): () => void {
  const handleKeyDown = (event: Event) => {
    const keyboardEvent = event as KeyboardEvent
    shortcuts.forEach((shortcut) => {
      const ctrlMatch = shortcut.ctrl ? keyboardEvent.ctrlKey : !keyboardEvent.ctrlKey
      const shiftMatch = shortcut.shift ? keyboardEvent.shiftKey : !keyboardEvent.shiftKey
      const altMatch = shortcut.alt ? keyboardEvent.altKey : !keyboardEvent.altKey
      const metaMatch = shortcut.meta ? keyboardEvent.metaKey : !keyboardEvent.metaKey

      if (
        keyboardEvent.key === shortcut.key &&
        ctrlMatch &&
        shiftMatch &&
        altMatch &&
        metaMatch
      ) {
        keyboardEvent.preventDefault()
        shortcut.handler()
      }
    })
  }

  const target = element || document
  target.addEventListener('keydown', handleKeyDown as EventListener)

  return () => {
    target.removeEventListener('keydown', handleKeyDown as EventListener)
  }
}

/**
 * Common keyboard shortcuts
 */
export const commonShortcuts = {
  copy: {
    key: 'c',
    ctrl: true,
  },
  paste: {
    key: 'v',
    ctrl: true,
  },
  search: {
    key: 'f',
    ctrl: true,
  },
  escape: {
    key: 'Escape',
  },
}

