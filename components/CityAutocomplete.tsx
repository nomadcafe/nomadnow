'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { debounce } from '@/lib/debounce'
import { getCountryFlag, getCountryName } from '@/lib/countries'

interface Suggestion {
  label: string
  city: string
  country: string
  lat: number
  lon: number
}

interface CityAutocompleteProps {
  value: string
  // Called when the user picks a suggestion. Fills city + country + coords
  // together so the StaysEditor can store them as one atomic update.
  // Plain typing without selection still calls onCityChange with the raw
  // text so users can save city-only entries when the geocoder doesn't
  // find a match (small towns, transliterations, etc.).
  onSelect: (s: Suggestion) => void
  onCityChange: (city: string) => void
  placeholder?: string
}

export function CityAutocomplete({
  value,
  onSelect,
  onCityChange,
  placeholder,
}: CityAutocompleteProps) {
  const t = useTranslations('cityAutocomplete')
  const [query, setQuery] = useState(value)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Sync external value changes (e.g. parent reset) into local input state.
  useEffect(() => {
    setQuery(value)
  }, [value])

  // Click-outside collapses the dropdown without dropping the typed value
  // so the user can keep their custom text if no suggestion fit.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Debounced search — 400ms gives the typer breathing room and keeps us
  // under Nominatim's 1 req/s policy even if a user mashes the keyboard.
  const search = useMemo(
    () =>
      debounce(async (q: string) => {
        if (q.trim().length < 2) {
          setSuggestions([])
          setLoading(false)
          return
        }
        setLoading(true)
        try {
          const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
          const data = await res.json()
          setSuggestions(Array.isArray(data.results) ? data.results : [])
        } catch {
          setSuggestions([])
        } finally {
          setLoading(false)
        }
      }, 400),
    [],
  )

  const onChange = (next: string) => {
    setQuery(next)
    onCityChange(next)
    setOpen(true)
    setHighlightIdx(-1)
    search(next)
  }

  const pick = (s: Suggestion) => {
    setQuery(s.city)
    onSelect(s)
    setOpen(false)
    setSuggestions([])
  }

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx((i) => Math.min(suggestions.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter' && highlightIdx >= 0) {
      e.preventDefault()
      pick(suggestions[highlightIdx])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={onKey}
        placeholder={placeholder}
        maxLength={100}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 text-sm"
        autoComplete="off"
        spellCheck={false}
      />
      {open && (loading || suggestions.length > 0) && (
        <div className="absolute left-0 right-0 top-full mt-1 z-30 max-h-60 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {loading && suggestions.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-500">{t('searching')}</div>
          )}
          {suggestions.map((s, i) => (
            <button
              key={`${s.city}-${s.country}-${s.lat}`}
              type="button"
              onMouseDown={(e) => e.preventDefault()} // keep input focused
              onClick={() => pick(s)}
              className={`w-full text-left px-3 py-2 text-sm flex items-start gap-2 transition ${
                i === highlightIdx ? 'bg-gray-100' : 'hover:bg-gray-50'
              }`}
            >
              <span className="text-lg leading-none mt-0.5" aria-hidden>
                {getCountryFlag(s.country)}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-medium text-gray-900 truncate">
                  {s.city}
                </span>
                <span className="block text-xs text-gray-500 truncate">
                  {getCountryName(s.country) || s.country} · {s.label.split(',').slice(1).join(',').trim()}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
