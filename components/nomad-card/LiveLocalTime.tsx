'use client'

import { useEffect, useState } from 'react'

interface Props {
  timezone?: string
  mutedClass: string
}

// Live "what time is it where they are" chip. Pulses a green dot like the
// Logo so it reads as "now". Separated from NomadCard so the rest of the
// card can render on the server — the clock tick is the only reason this
// piece needs to be client-side.
export function LiveLocalTime({ timezone, mutedClass }: Props) {
  const [time, setTime] = useState<string | null>(null)

  useEffect(() => {
    if (!timezone) return
    function tick() {
      try {
        setTime(
          new Date().toLocaleTimeString('en-US', {
            timeZone: timezone,
            hour: 'numeric',
            minute: '2-digit',
            hour12: false,
          }),
        )
      } catch {
        setTime(null)
      }
    }
    tick()
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [timezone])

  if (!time) return null

  return (
    <>
      <span className={mutedClass} aria-hidden>
        ·
      </span>
      <span className="relative inline-flex items-center" aria-hidden>
        <span className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-green-500 opacity-70 motion-safe:animate-ping" />
        <span className="relative w-1.5 h-1.5 rounded-full bg-green-500" />
      </span>
      <span
        className={`font-mono tabular-nums text-sm sm:text-base ${mutedClass}`}
        aria-label={`Local time ${time}`}
      >
        {time}
      </span>
    </>
  )
}
