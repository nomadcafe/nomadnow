// Country data.
//
// Two distinct sets, deliberately separate:
//   1. countryOptions / getCountryName / getCountryFlag — the FULL ISO 3166-1
//      set (~249). Names come from Intl.DisplayNames and flags are computed
//      from the 2-letter code, so every country a nomad could actually be in
//      resolves to a real name + flag. The visited-countries picker, the
//      current-city flag, the Stays editor, and the explore cards all use this.
//   2. countries (CENTROIDS) — a curated subset WITH lat/lon centroids, used
//      only by WorldMap to plot dots and by the /in + /map hotspot pages.
//      Plotting needs coordinates, which only exist for this hand-picked set.
//
// Previously a single hardcoded 48-country array backed everything, so any
// country outside it couldn't be selected and rendered as "🌍 + raw code"
// on cards. Splitting the concerns fixes that without inventing centroids for
// 200 countries the map can't meaningfully place.

// Full set: code + centroid. For WorldMap dots + /in + /map. Coordinates are
// rough country centroids.
export interface Country {
  code: string
  name: string
  flag: string
  lat: number
  lon: number
}

// Lightweight option for pickers / lookups where coordinates don't matter.
export interface CountryOption {
  code: string
  name: string
  flag: string
}

// Centroids for the map-plottable set. code → [lat, lon].
const CENTROIDS: Record<string, [number, number]> = {
  TH: [13.75, 100.5], JP: [36.2, 138.25], PT: [39.4, -8.2], VN: [14.06, 108.28],
  MY: [4.21, 101.98], ID: [-0.79, 113.92], PH: [12.88, 121.77], ES: [40.46, -3.75],
  IT: [41.87, 12.57], GR: [39.07, 21.82], TR: [38.96, 35.24], GE: [42.32, 43.36],
  MX: [23.63, -102.55], CO: [4.57, -74.3], AR: [-34.6, -58.4], BR: [-14.24, -51.93],
  CL: [-35.68, -71.54], UY: [-32.52, -55.77], CR: [9.75, -83.75], EC: [-1.83, -78.18],
  AE: [23.42, 53.85], SG: [1.35, 103.82], TW: [23.7, 120.96], KR: [35.91, 127.77],
  CN: [35.86, 104.2], IN: [20.59, 78.96], DE: [51.17, 10.45], FR: [46.23, 2.21],
  NL: [52.13, 5.29], GB: [55.38, -3.44], IE: [53.41, -8.24], PL: [51.92, 19.13],
  CZ: [49.82, 15.47], HU: [47.16, 19.5], RO: [45.94, 24.97], BG: [42.73, 25.49],
  RS: [44.02, 21.01], HR: [45.1, 15.2], ME: [42.71, 19.37], AL: [41.15, 20.17],
  MA: [31.79, -7.09], EG: [26.82, 30.8], ZA: [-30.56, 22.94], KE: [-0.02, 37.91],
  NZ: [-40.9, 174.89], AU: [-25.27, 133.78], CA: [56.13, -106.35], US: [37.09, -95.71],
}

// Full ISO 3166-1 alpha-2 list — every code a city autocomplete or a traveller
// could surface. Names/flags are derived, so this only needs the codes.
const ALL_CODES: string[] = [
  'AD','AE','AF','AG','AI','AL','AM','AO','AR','AT','AU','AW','AX','AZ','BA','BB','BD','BE',
  'BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS','BT','BW','BY','BZ','CA','CC',
  'CD','CF','CG','CH','CI','CK','CL','CM','CN','CO','CR','CU','CV','CW','CX','CY','CZ','DE',
  'DJ','DK','DM','DO','DZ','EC','EE','EG','EH','ER','ES','ET','FI','FJ','FK','FM','FO','FR',
  'GA','GB','GD','GE','GF','GG','GH','GI','GL','GM','GN','GP','GQ','GR','GT','GU','GW','GY',
  'HK','HN','HR','HT','HU','ID','IE','IL','IM','IN','IO','IQ','IR','IS','IT','JE','JM','JO',
  'JP','KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ','LA','LB','LC','LI','LK','LR',
  'LS','LT','LU','LV','LY','MA','MC','MD','ME','MF','MG','MH','MK','ML','MM','MN','MO','MP',
  'MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ','NA','NC','NE','NF','NG','NI','NL','NO',
  'NP','NR','NU','NZ','OM','PA','PE','PF','PG','PH','PK','PL','PM','PN','PR','PS','PT','PW',
  'PY','QA','RE','RO','RS','RU','RW','SA','SB','SC','SD','SE','SG','SH','SI','SK','SL','SM',
  'SN','SO','SR','SS','ST','SV','SX','SY','SZ','TC','TD','TG','TH','TJ','TK','TL','TM','TN',
  'TO','TR','TT','TV','TW','TZ','UA','UG','US','UY','UZ','VA','VC','VE','VG','VI','VN','VU',
  'WF','WS','XK','YE','YT','ZA','ZM','ZW',
]

// Flag emoji from a 2-letter code via regional-indicator symbols — works for
// any valid ISO code without storing 249 emoji. Invalid input → globe.
export function flagForCode(code: string): string {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return '🌍'
  const cc = code.toUpperCase()
  return String.fromCodePoint(
    0x1f1e6 + cc.charCodeAt(0) - 65,
    0x1f1e6 + cc.charCodeAt(1) - 65,
  )
}

// English region names via Intl.DisplayNames (full ICU, present in all target
// runtimes). Built once; falls back to the raw code if unavailable.
type RegionNames = { of: (code: string) => string | undefined }
const regionNames: RegionNames | null = (() => {
  try {
    const DN = (Intl as unknown as { DisplayNames?: new (l: string[], o: object) => RegionNames })
      .DisplayNames
    return DN ? new DN(['en'], { type: 'region' }) : null
  } catch {
    return null
  }
})()

// Keep the names that the old curated list used, where Intl.DisplayNames now
// returns a different (modern) form. This preserves existing card display AND
// the /in/{slug} SEO URLs (e.g. /in/turkey, /in/uae) that slugForCountry
// derives from the name — switching to "Türkiye"/"Czechia"/"United Arab
// Emirates" would silently 404 the already-indexed hotspot pages.
const NAME_OVERRIDES: Record<string, string> = {
  TR: 'Turkey',
  CZ: 'Czech Republic',
  AE: 'UAE',
}

export const getCountryName = (code: string): string => {
  if (!code) return code
  const cc = code.toUpperCase()
  if (NAME_OVERRIDES[cc]) return NAME_OVERRIDES[cc]
  try {
    return regionNames?.of(cc) || cc
  } catch {
    return cc
  }
}

export const getCountryFlag = (code: string): string => flagForCode(code)

export const getCountryByCode = (code: string): CountryOption | undefined => {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return undefined
  const cc = code.toUpperCase()
  return { code: cc, name: getCountryName(cc), flag: flagForCode(cc) }
}

// Full picker list — every ISO country, name-sorted. Built once at module load.
export const countryOptions: CountryOption[] = ALL_CODES
  .map((code) => ({ code, name: getCountryName(code), flag: flagForCode(code) }))
  .sort((a, b) => a.name.localeCompare(b.name))

// Map-plottable set (centroids). Names/flags single-sourced through the helpers
// so they stay consistent with the full list.
export const countries: Country[] = Object.entries(CENTROIDS).map(([code, [lat, lon]]) => ({
  code,
  name: getCountryName(code),
  flag: flagForCode(code),
  lat,
  lon,
}))

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
// Resolves against the map-plottable set (the curated hotspot pages we
// pre-generate). Returns undefined when no known country matches.
export function codeForSlug(slug: string): string | undefined {
  if (!slug) return undefined
  const normalized = slug.toLowerCase().trim()
  return countries.find((c) => slugForCountry(c.code) === normalized)?.code
}
