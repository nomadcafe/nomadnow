'use client'

import React, { useEffect, useState } from 'react'

interface City {
  flag: string
  name: string
  timezone: string
  role: string
}

const CITIES: City[] = [
  { flag: '🇵🇹', name: 'Lisbon', timezone: 'Europe/Lisbon', role: 'Designer' },
  { flag: '🇹🇭', name: 'Bangkok', timezone: 'Asia/Bangkok', role: 'Engineer' },
  { flag: '🇲🇽', name: 'Mexico City', timezone: 'America/Mexico_City', role: 'Founder' },
  { flag: '🇯🇵', name: 'Tokyo', timezone: 'Asia/Tokyo', role: 'Writer' },
]

function useTickingTime(timezone: string) {
  const [time, setTime] = useState<string>('')
  useEffect(() => {
    function tick() {
      try {
        setTime(
          new Date().toLocaleTimeString('en-US', {
            timeZone: timezone,
            hour: 'numeric',
            minute: '2-digit',
            hour12: false,
          })
        )
      } catch {
        setTime('')
      }
    }
    tick()
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [timezone])
  return time
}

function LiveCityCard({ city }: { city: City }) {
  const time = useTickingTime(city.timezone)
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition">
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl leading-none" aria-hidden>
          {city.flag}
        </span>
        <span className="text-xs text-gray-400 uppercase tracking-wider">{city.role}</span>
      </div>
      <div className="text-sm text-gray-600 mb-1">{city.name}</div>
      <div className="text-3xl font-semibold tabular-nums tracking-tight text-gray-900">
        {time || '··:··'}
      </div>
    </div>
  )
}

export function LiveCityRow() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      {CITIES.map((city) => (
        <LiveCityCard key={city.name} city={city} />
      ))}
    </div>
  )
}
