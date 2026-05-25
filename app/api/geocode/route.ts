import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/errors'

// Server-side proxy to Nominatim (OpenStreetMap's free geocoder). Reasons
// to proxy rather than calling from the browser:
//   - Nominatim requires a descriptive User-Agent identifying the app and
//     contact; the browser would expose ours and we can't set arbitrary
//     headers from cross-origin fetch in some cases.
//   - Centralised throttling — Nominatim's usage policy is 1 req/sec per
//     app. Our existing middleware rate-limiter already throttles per IP,
//     plus we cache here so duplicate prefixes hit the API less.
//   - Reshape the response so the client receives only what it needs.
//
// Returns 5 suggestions per query, each with display name, city, country
// (ISO α-2), and coordinates. Empty / too-short queries return [].

const MIN_QUERY_LEN = 2
const MAX_RESULTS = 5

interface NominatimResult {
  display_name?: string
  lat?: string
  lon?: string
  address?: {
    city?: string
    town?: string
    village?: string
    hamlet?: string
    municipality?: string
    suburb?: string
    state?: string
    country_code?: string
  }
}

export interface GeocodeSuggestion {
  label: string
  city: string
  country: string // ISO α-2 uppercase
  lat: number
  lon: number
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').trim()
  if (q.length < MIN_QUERY_LEN) {
    return NextResponse.json({ results: [] })
  }

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('q', q)
    url.searchParams.set('format', 'json')
    url.searchParams.set('addressdetails', '1')
    url.searchParams.set('limit', String(MAX_RESULTS))
    // Bias to cities/towns by featuretype — Nominatim still returns other
    // hits but cities surface first, which is what nomads pick 99% of
    // the time when typing a city name.
    url.searchParams.set('featuretype', 'city')

    const res = await fetch(url.toString(), {
      headers: {
        // Required by Nominatim's policy. Identifies the app and a
        // contact route so they can email us if we misbehave instead
        // of silently rate-limiting.
        'User-Agent': 'NomadNow/0.1 (https://www.nomad.now)',
        Accept: 'application/json',
      },
      // Cache identical queries at the edge so we don't hammer Nominatim
      // when many users start typing "Ban" at the same time.
      next: { revalidate: 60 * 60 * 24 },
    })

    if (!res.ok) {
      logError(new Error(`Nominatim status ${res.status}`), { operation: 'geocode', q })
      return NextResponse.json({ results: [] })
    }

    const raw = (await res.json()) as NominatimResult[]
    const results: GeocodeSuggestion[] = []
    for (const r of raw) {
      const addr = r.address || {}
      const city =
        addr.city || addr.town || addr.village || addr.hamlet || addr.municipality || ''
      const country = (addr.country_code || '').toUpperCase()
      if (!city || country.length !== 2 || !r.lat || !r.lon) continue
      // De-dup by city+country in case Nominatim returns the same place
      // under multiple OSM type rows (e.g. district + city).
      if (results.some((s) => s.city === city && s.country === country)) continue
      results.push({
        label: r.display_name || `${city}, ${country}`,
        city,
        country,
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
      })
    }

    return NextResponse.json({ results })
  } catch (err) {
    logError(err, { operation: 'geocode', q })
    return NextResponse.json({ results: [] })
  }
}
