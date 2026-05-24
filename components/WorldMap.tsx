import { countries, getCountryName } from '@/lib/countries'

interface WorldMapProps {
  // Visited countries (binary mode): each gets a uniform highlighted dot.
  // Used by the Nomad Card to plot one user's travel.
  visitedCodes?: string[] | null
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

// Map a weight to a dot radius. Uses sqrt so a country with 100 visitors
// isn't 10x bigger than one with 10 — it's ~3x. Clamped so single-visitor
// countries are still visible and outliers don't dominate the canvas.
function radiusForWeight(weight: number, maxWeight: number): number {
  if (weight <= 0) return 0
  const minR = 4
  const maxR = 22
  const norm = Math.sqrt(weight) / Math.sqrt(maxWeight || 1)
  return minR + (maxR - minR) * norm
}

export function WorldMap({
  visitedCodes,
  className = '',
  accentColor = '#3b82f6',
  baseColor = '#e5e7eb',
  weights,
}: WorldMapProps) {
  const isDensity = !!weights && Object.keys(weights).length > 0
  const visited = new Set(visitedCodes ?? [])
  const visitedCount = visited.size
  const latStroke = baseColor === '#e5e7eb' ? '#f3f4f6' : `${baseColor}33`

  const maxWeight = isDensity ? Math.max(...Object.values(weights!)) : 0

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
        {/* Latitude reference lines */}
        <g stroke={latStroke} strokeWidth="1" fill="none">
          <line x1="0" y1={H / 2} x2={W} y2={H / 2} />
          <line x1="0" y1={((90 - 23.5) / 180) * H} x2={W} y2={((90 - 23.5) / 180) * H} />
          <line x1="0" y1={((90 + 23.5) / 180) * H} x2={W} y2={((90 + 23.5) / 180) * H} />
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

        {/* Foreground dots */}
        <g>
          {countries.map((c) => {
            const { x, y } = project(c.lat, c.lon)
            if (isDensity) {
              const w = weights![c.code] ?? 0
              if (w <= 0) return null
              const r = radiusForWeight(w, maxWeight)
              return (
                <g key={c.code}>
                  <circle cx={x} cy={y} r={r * 1.8} fill={accentColor} opacity="0.15" />
                  <circle cx={x} cy={y} r={r} fill={accentColor}>
                    <title>{`${getCountryName(c.code)} — ${w} ${w === 1 ? 'nomad' : 'nomads'}`}</title>
                  </circle>
                </g>
              )
            }
            if (!visited.has(c.code)) return null
            return (
              <g key={c.code}>
                <circle cx={x} cy={y} r={11} fill={accentColor} opacity="0.15" />
                <circle cx={x} cy={y} r={5.5} fill={accentColor}>
                  <title>{getCountryName(c.code)}</title>
                </circle>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
