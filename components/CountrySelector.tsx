'use client'

import React, { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { countries, getCountryByCode, type Country } from '@/lib/countries'

interface CountrySelectorProps {
  selectedCountries: string[]
  onChange: (countries: string[]) => void
  maxSelections?: number
}

export function CountrySelector({ selectedCountries, onChange, maxSelections }: CountrySelectorProps) {
  const t = useTranslations('countrySelector')
  const [searchTerm, setSearchTerm] = useState('')

  const handleToggle = (countryCode: string) => {
    if (selectedCountries.includes(countryCode)) {
      onChange(selectedCountries.filter((c) => c !== countryCode))
    } else {
      if (maxSelections && selectedCountries.length >= maxSelections) {
        return
      }
      onChange([...selectedCountries, countryCode])
    }
  }

  const selectedCountriesData = selectedCountries
    .map((code) => getCountryByCode(code))
    .filter((c): c is Country => c !== undefined)

  // Filter countries based on search term
  const filteredCountries = useMemo(() => {
    if (!searchTerm.trim()) {
      return countries
    }
    const term = searchTerm.toLowerCase()
    return countries.filter(
      (country) =>
        country.name.toLowerCase().includes(term) ||
        country.code.toLowerCase().includes(term)
    )
  }, [searchTerm])

  return (
    <div className="space-y-4">
      {/* Selected countries display */}
      {selectedCountriesData.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          {selectedCountriesData.map((country) => (
            <button
              key={country.code}
              type="button"
              onClick={() => handleToggle(country.code)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full border border-gray-300 hover:border-red-400 hover:bg-red-50 transition text-sm"
              aria-label={t('remove', { country: country.name })}
            >
              <span className="text-lg">{country.flag}</span>
              <span className="text-gray-700">{country.name}</span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* Search and filter */}
      <div className="relative">
        <input
          type="text"
          placeholder={t('search')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900"
          aria-label={t('search')}
        />
        <svg
          className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label={t('clearSearch')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Countries grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 max-h-64 overflow-y-auto p-2 border border-gray-200 rounded-lg bg-white">
        {filteredCountries.length > 0 ? (
          filteredCountries.map((country) => {
            const isSelected = selectedCountries.includes(country.code)
            const isDisabled = maxSelections && selectedCountries.length >= maxSelections && !isSelected

            return (
              <button
                key={country.code}
                type="button"
                onClick={() => handleToggle(country.code)}
                disabled={!!isDisabled}
                className={`
                  flex flex-col items-center justify-center gap-1 p-3 rounded-lg border-2 transition
                  ${isSelected
                    ? 'border-gray-900 bg-gray-100 text-gray-900'
                    : isDisabled
                    ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                    : 'border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50 text-gray-700'
                  }
                `}
                aria-label={
                  isSelected
                    ? t('remove', { country: country.name })
                    : t('add', { country: country.name })
                }
              >
                <span className="text-2xl">{country.flag}</span>
                <span className="text-xs font-medium truncate w-full text-center">{country.name}</span>
              </button>
            )
          })
        ) : (
          <div className="col-span-full text-center py-8 text-gray-500">
            <p>{t('noResults')}</p>
            <p className="text-xs mt-1">{t('noResultsHint')}</p>
          </div>
        )}
      </div>

      {maxSelections && (
        <p className="text-xs text-gray-500 text-center">
          {selectedCountries.length} / {maxSelections} {t('selected')}
        </p>
      )}
    </div>
  )
}

