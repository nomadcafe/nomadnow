import { countries, getCountryName } from '@/lib/countries'
import { mergedVisitedCodes } from '@/lib/stays'

interface CityDot {
  // Display name (e.g. "Bangkok"). Used for the SVG <title> tooltip.
  city: string
  // ISO 3166-1 alpha-2; lets us render a country flag in the tooltip
  // and group dots by country if a future style wants that.
  country: string
  lat: number
  lon: number
}

interface WorldMapProps {
  // Visited countries (binary mode): each gets a uniform highlighted dot.
  // Used by the Nomad Card to plot one user's travel at country level
  // when stays-level data isn't available.
  visitedCodes?: string[] | null
  // City-level dots from nomad_stays. When any of these have lat/lon,
  // they take precedence over visitedCodes and we render dots at the
  // exact coordinates — gives a much truer picture of "where I've
  // actually been" than country-centroid dots.
  cityDots?: CityDot[] | null
  className?: string
  // Override the highlighted dot color (used by Nomad Card themes).
  accentColor?: string
  // Override the background constellation dot color (default light gray works on white;
  // dark themes pass a lighter color to stay visible on a dark card).
  baseColor?: string
  // Density mode: a map of country code -> count. Dot radius scales with count.
  // When provided, takes precedence over visitedCodes.
  // Used by /map to show aggregate traffic across all users.
  weights?: Record<string, number> | null
}

// SVG viewBox uses equirectangular projection: x = (lon+180)/360 * W, y = (90-lat)/180 * H.
const W = 720
const H = 360

function project(lat: number, lon: number) {
  const x = ((lon + 180) / 360) * W
  const y = ((90 - lat) / 180) * H
  return { x, y }
}

// Maps a weight to a dot radius. Uses sqrt so a country with 100 visitors
// isn't 10x bigger than one with 10 — it's ~3x. Clamped so single-visitor
// countries are still visible and outliers don't dominate the canvas.
function radiusForWeight(weight: number, maxWeight: number): number {
  if (weight <= 0) return 0
  const minR = 4
  const maxR = 22
  const norm = Math.sqrt(weight) / Math.sqrt(maxWeight || 1)
  return minR + (maxR - minR) * norm
}

// ISO 3166-1 alpha-2 → regional indicator emoji pair (e.g. "JP" → 🇯🇵).
// Works across modern browsers and most mobile platforms. Renders inside
// SVG <text>; cross-platform fallback is the country name in the title.
function flagFor(code: string): string {
  if (!code || code.length !== 2) return ''
  const A = 0x1f1e6
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split('')
      .map((c) => A + c.charCodeAt(0) - 65),
  )
}

export function WorldMap({
  visitedCodes,
  cityDots,
  className = '',
  accentColor = '#3b82f6',
  baseColor = '#e5e7eb',
  weights,
}: WorldMapProps) {
  const isDensity = !!weights && Object.keys(weights).length > 0
  const latStroke = baseColor === '#e5e7eb' ? '#f3f4f6' : `${baseColor}33`

  // Only render city dots from stays that actually carry coordinates —
  // a stay without lat/lon (user typed a city without picking an
  // autocomplete suggestion) shouldn't render at (0, 0).
  const validCityDots = (cityDots ?? []).filter(
    (d) => typeof d.lat === 'number' && typeof d.lon === 'number',
  )
  // De-dup by city+country so re-visiting the same city doesn't stack.
  const dedupedCityDots = Array.from(
    new Map(validCityDots.map((d) => [`${d.city}-${d.country}`, d])).values(),
  )
  // Country highlights now come from the UNION of explicit visited_countries
  // toggles and the countries derived from city stays. Before this merge, a
  // user with stays would lose all country-level highlighting because the
  // map flipped to "city mode" exclusively — losing visual context for
  // countries they'd visited without recording a specific city.
  const visited = isDensity ? new Set<string>() : mergedVisitedCodes(visitedCodes, dedupedCityDots)
  const visitedCount = visited.size
  const cityCount = dedupedCityDots.length

  const maxWeight = isDensity ? Math.max(...Object.values(weights!)) : 0

  // Stable id for SVG defs — needed for filter / animation refs. Different
  // accent colors get different ids so two WorldMaps on the same page (e.g.
  // /map plus a preview) don't clash.
  const idSuffix = accentColor.replace('#', '')

  return (
    <div className={`w-full ${className}`}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={
          isDensity
            ? `Density map across ${Object.keys(weights!).length} countries`
            : `Visited ${visitedCount} of ${countries.length} popular nomad countries`
        }
        className="w-full h-auto"
      >
        <defs>
          {/* Soft glow behind highlighted dots — radial gradient that fades
              from the accent color to transparent. */}
          <radialGradient id={`dot-glow-${idSuffix}`}>
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.35" />
            <stop offset="60%" stopColor={accentColor} stopOpacity="0.08" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Latitude reference lines: equator + tropics. */}
        <g stroke={latStroke} strokeWidth="1" fill="none">
          <line x1="0" y1={H / 2} x2={W} y2={H / 2} />
          <line x1="0" y1={((90 - 23.5) / 180) * H} x2={W} y2={((90 - 23.5) / 180) * H} />
          <line x1="0" y1={((90 + 23.5) / 180) * H} x2={W} y2={((90 + 23.5) / 180) * H} />
        </g>

        {/* Longitude reference lines: every 60°. Subtle — adds geographic
            context without competing with the dots. */}
        <g stroke={latStroke} strokeWidth="1" fill="none" strokeDasharray="2 4">
          {[-120, -60, 0, 60, 120].map((lon) => {
            const x = ((lon + 180) / 360) * W
            return <line key={lon} x1={x} y1="0" x2={x} y2={H} />
          })}
        </g>

        {/* Base constellation (only when not in density mode, or for countries with 0 weight) */}
        <g>
          {countries.map((c) => {
            const { x, y } = project(c.lat, c.lon)
            const inForeground = isDensity ? (weights![c.code] ?? 0) > 0 : visited.has(c.code)
            if (inForeground) return null
            return (
              <circle key={c.code} cx={x} cy={y} r={2.5} fill={baseColor}>
                <title>{c.name}</title>
              </circle>
            )
          })}
        </g>

        {/* Foreground country dots — density mode uses weights to size the
            dots; otherwise renders one dot per code in the merged visited
            set. City dots are layered on top in a separate <g> below. */}
        <g>
          {countries.map((c) => {
            const { x, y } = project(c.lat, c.lon)
            if (isDensity) {
              const w = weights![c.code] ?? 0
              if (w <= 0) return null
              const r = radiusForWeight(w, maxWeight)
              return (
                <g key={c.code}>
                  <circle cx={x} cy={y} r={r * 2.4} fill={`url(#dot-glow-${idSuffix})`} />
                  <circle cx={x} cy={y} r={r} fill={accentColor}>
                    <title>{`${getCountryName(c.code)} — ${w} ${w === 1 ? 'nomad' : 'nomads'}`}</title>
                  </circle>
                </g>
              )
            }
            if (!visited.has(c.code)) return null
            return (
              <g key={c.code} className="motion-safe:animate-pulse-slow">
                <circle cx={x} cy={y} r={16} fill={`url(#dot-glow-${idSuffix})`} />
                <circle cx={x} cy={y} r={6} fill={accentColor} stroke="white" strokeWidth="1.5">
                  <title>{getCountryName(c.code)}</title>
                </circle>
                <text
                  x={x}
                  y={y - 14}
                  fontSize="22"
                  textAnchor="middle"
                  style={{ pointerEvents: 'none' }}
                >
                  {flagFor(c.code)}
                </text>
              </g>
            )
          })}
        </g>

        {/* City-level dots layered on top — smaller than country dots so
            multiple cities in one country don't blob into the country
            highlight. City name flag renders above each dot. */}
        {!isDensity && cityCount > 0 && (
          <g>
            {dedupedCityDots.map((d) => {
              const { x, y } = project(d.lat, d.lon)
              return (
                <g key={`${d.city}-${d.country}-${d.lat}-${d.lon}`} className="motion-safe:animate-pulse-slow">
                  <circle cx={x} cy={y} r={10} fill={`url(#dot-glow-${idSuffix})`} />
                  <circle cx={x} cy={y} r={3.5} fill={accentColor} stroke="white" strokeWidth="1.25">
                    <title>{`${d.city}, ${getCountryName(d.country)}`}</title>
                  </circle>
                </g>
              )
            })}
          </g>
        )}

        {/* Count overlay in bottom-right. Shows both numbers when both
            sources have data; falls back to whichever single number when
            only one is present. */}
        {!isDensity && (visitedCount > 0 || cityCount > 0) && (
          <g>
            <text
              x={W - 12}
              y={H - 12}
              textAnchor="end"
              fontSize="14"
              fontWeight="600"
              fill={baseColor === '#e5e7eb' ? '#374151' : 'white'}
              opacity="0.7"
            >
              {cityCount > 0 && visitedCount > 0
                ? `${cityCount} ${cityCount === 1 ? 'city' : 'cities'} · ${visitedCount} ${visitedCount === 1 ? 'country' : 'countries'}`
                : cityCount > 0
                  ? `${cityCount} ${cityCount === 1 ? 'city' : 'cities'}`
                  : `${visitedCount} ${visitedCount === 1 ? 'country' : 'countries'}`}
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
