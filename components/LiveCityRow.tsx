'use client'

import React, { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

interface City {
  flag: string
  name: string
  timezone: string
  // `roleKey` matches a key in the `roles.*` i18n namespace. Stored as English
  // so the homepage demo data and DB-stored role values share the same map.
  roleKey: string
}

const CITIES: City[] = [
  { flag: '🇵🇹', name: 'Lisbon', timezone: 'Europe/Lisbon', roleKey: 'Designer' },
  { flag: '🇹🇭', name: 'Bangkok', timezone: 'Asia/Bangkok', roleKey: 'Engineer' },
  { flag: '🇲🇽', name: 'Mexico City', timezone: 'America/Mexico_City', roleKey: 'Founder' },
  { flag: '🇯🇵', name: 'Tokyo', timezone: 'Asia/Tokyo', roleKey: 'Writer' },
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
  const tRole = useTranslations('roles')
  const time = useTickingTime(city.timezone)
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition">
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl leading-none" aria-hidden>
          {city.flag}
        </span>
        <span className="text-xs text-gray-400 uppercase tracking-wider">{tRole(city.roleKey)}</span>
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
