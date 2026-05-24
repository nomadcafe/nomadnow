// Country data with flag emojis and approximate centroid coordinates
// (lat, lon — used by components/WorldMap.tsx to plot dots).
export interface Country {
  code: string
  name: string
  flag: string
  lat: number
  lon: number
}

// Popular destinations for digital nomads. Coordinates are rough country centroids.
export const countries: Country[] = [
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', lat: 13.75, lon: 100.5 },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', lat: 36.2, lon: 138.25 },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', lat: 39.4, lon: -8.2 },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', lat: 14.06, lon: 108.28 },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', lat: 4.21, lon: 101.98 },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', lat: -0.79, lon: 113.92 },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', lat: 12.88, lon: 121.77 },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', lat: 40.46, lon: -3.75 },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', lat: 41.87, lon: 12.57 },
  { code: 'GR', name: 'Greece', flag: '🇬🇷', lat: 39.07, lon: 21.82 },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷', lat: 38.96, lon: 35.24 },
  { code: 'GE', name: 'Georgia', flag: '🇬🇪', lat: 42.32, lon: 43.36 },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', lat: 23.63, lon: -102.55 },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', lat: 4.57, lon: -74.3 },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', lat: -34.6, lon: -58.4 },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', lat: -14.24, lon: -51.93 },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', lat: -35.68, lon: -71.54 },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', lat: -32.52, lon: -55.77 },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', lat: 9.75, lon: -83.75 },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨', lat: -1.83, lon: -78.18 },
  { code: 'AE', name: 'UAE', flag: '🇦🇪', lat: 23.42, lon: 53.85 },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', lat: 1.35, lon: 103.82 },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼', lat: 23.7, lon: 120.96 },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', lat: 35.91, lon: 127.77 },
  { code: 'CN', name: 'China', flag: '🇨🇳', lat: 35.86, lon: 104.2 },
  { code: 'IN', name: 'India', flag: '🇮🇳', lat: 20.59, lon: 78.96 },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', lat: 51.17, lon: 10.45 },
  { code: 'FR', name: 'France', flag: '🇫🇷', lat: 46.23, lon: 2.21 },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', lat: 52.13, lon: 5.29 },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', lat: 55.38, lon: -3.44 },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', lat: 53.41, lon: -8.24 },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', lat: 51.92, lon: 19.13 },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', lat: 49.82, lon: 15.47 },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺', lat: 47.16, lon: 19.5 },
  { code: 'RO', name: 'Romania', flag: '🇷🇴', lat: 45.94, lon: 24.97 },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬', lat: 42.73, lon: 25.49 },
  { code: 'RS', name: 'Serbia', flag: '🇷🇸', lat: 44.02, lon: 21.01 },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷', lat: 45.1, lon: 15.2 },
  { code: 'ME', name: 'Montenegro', flag: '🇲🇪', lat: 42.71, lon: 19.37 },
  { code: 'AL', name: 'Albania', flag: '🇦🇱', lat: 41.15, lon: 20.17 },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦', lat: 31.79, lon: -7.09 },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', lat: 26.82, lon: 30.8 },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', lat: -30.56, lon: 22.94 },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', lat: -0.02, lon: 37.91 },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', lat: -40.9, lon: 174.89 },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', lat: -25.27, lon: 133.78 },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', lat: 56.13, lon: -106.35 },
  { code: 'US', name: 'United States', flag: '🇺🇸', lat: 37.09, lon: -95.71 },
]

export const getCountryByCode = (code: string): Country | undefined => {
  return countries.find((c) => c.code === code)
}

export const getCountryFlag = (code: string): string => {
  const country = getCountryByCode(code)
  return country?.flag || '🌍'
}

export const getCountryName = (code: string): string => {
  const country = getCountryByCode(code)
  return country?.name || code
}

// URL slug used by /in/{slug}. "South Korea" → "south-korea".
// Strips diacritics, lowercases, replaces non-alphanumerics with hyphens.
export function slugForCountry(code: string): string {
  const name = getCountryName(code)
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Reverse lookup for the /in/[country] route. Case- and hyphen-insensitive.
// Returns undefined when no known country matches.
export function codeForSlug(slug: string): string | undefined {
  if (!slug) return undefined
  const normalized = slug.toLowerCase().trim()
  return countries.find((c) => slugForCountry(c.code) === normalized)?.code
}
