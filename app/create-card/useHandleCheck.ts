'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { debounce } from '@/lib/debounce'
import type { HandleStatus } from './form-constants'

interface UseHandleCheckResult {
  status: HandleStatus
  error: string
}

// Watches a handle input and reports availability against the API. In edit
// mode the handle is server-locked so we short-circuit to a static
// "available" status (so the submit button isn't disabled by handle status).
//
// Two safeguards baked in:
//   - 500ms debounce on the input so a fast typer doesn't fire one fetch
//     per keystroke.
//   - AbortController to cancel any in-flight check when a newer keystroke
//     comes in. Without this, network jitter could let a slow stale
//     response overwrite a fresh fast one and flash the wrong status.
export function useHandleCheck(handle: string, isEdit: boolean): UseHandleCheckResult {
  const t = useTranslations('createCard')
  const [status, setStatus] = useState<HandleStatus>(isEdit ? 'available' : 'idle')
  const [error, setError] = useState<string>('')
  const abortRef = useRef<AbortController | null>(null)

  const check = useCallback(
    debounce(async (value: string) => {
      if (!value.trim()) {
        setStatus('idle')
        return
      }

      const handleRegex = /^[a-zA-Z0-9_-]+$/
      if (!handleRegex.test(value) || value.length < 2 || value.length > 50) {
        setStatus('invalid')
        setError(t('handleInvalid'))
        return
      }

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setStatus('checking')
      try {
        const response = await fetch(
          `/api/users/check-handle?handle=${encodeURIComponent(value.toLowerCase())}`,
          { signal: controller.signal },
        )
        const data = await response.json()

        if (data.available) {
          setStatus('available')
          setError('')
        } else {
          setStatus('unavailable')
          setError(t('handleTaken'))
        }
      } catch (err) {
        // AbortError fires when a newer keystroke superseded this check —
        // the next call's response wins, so don't surface anything to the
        // user here.
        if (err instanceof DOMException && err.name === 'AbortError') return
        setStatus('idle')
        setError(t('handleCheckError'))
      }
    }, 500),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useEffect(() => {
    if (isEdit) return
    check(handle)
  }, [handle, check, isEdit])

  return { status, error }
}
