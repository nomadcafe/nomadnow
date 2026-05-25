'use client'

import { useEffect, useState } from 'react'

// Big "currently in {city}" clock for the homepage Feature 2 visual.
// The whole point of that feature row is "live local time" — and the
// previous render hard-coded "07:42", which undermined the pitch. This
// component ticks every minute so the number is actually correct.
//
// Kept separate from LiveCityRow because the visual treatment here is
// very different (single hero clock vs grid of small cards) and we
// don't want to wrap LiveCityCard in a one-off variant prop.
export function LiveTimezoneCard({
  city,
  timezone,
  caption,
}: {
  city: string
  timezone: string
  caption: string
}) {
  const [time, setTime] = useState<string>('··:··')
  useEffect(() => {
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
        // Invalid IANA tz — keep the placeholder rather than throw.
      }
    }
    tick()
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [timezone])

  return (
    <div className="bg-white border border-gray-200 rounded-3xl p-10 shadow-sm text-center">
      <div className="text-sm text-gray-500 mb-2">📍 {city}</div>
      <div className="text-7xl font-semibold font-mono tabular-nums tracking-tight text-gray-900">
        {time}
      </div>
      <div className="text-xs text-gray-400 uppercase tracking-wider mt-3">
        {caption}
      </div>
    </div>
  )
}
