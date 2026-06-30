// Custom-background resolution and validation. Two storage columns on
// profile_settings:
//   - background_mode: 'theme' | 'solid' | 'gradient'
//   - background_value: JSONB whose shape depends on mode (or null)
//
// The renderer only ever produces a CSS `background` value (or null when
// the theme default should win). Invalid stored values fall through to
// the theme default rather than throwing — keeps a corrupted row from
// breaking the public card render.

export type BackgroundMode = 'theme' | 'solid' | 'gradient' | 'image'
export const BACKGROUND_MODE_KEYS = ['theme', 'solid', 'gradient', 'image'] as const

export interface BackgroundSolid {
  color: string
}
export interface BackgroundGradient {
  from: string
  to: string
  angle: number
}
export interface BackgroundImage {
  // A public URL on our own Supabase Storage (set by the background uploader).
  // The card paints it cover/center behind the (opaque) card surface.
  url: string
}

export type BackgroundValue = BackgroundSolid | BackgroundGradient | BackgroundImage | null

// A Storage image URL safe to drop into a CSS url(): https only and free of
// the quote/paren/whitespace characters that could break out of the
// `url("…")` token. Pairs with the write-time host check in the settings API —
// this is the render-time backstop so a hand-crafted DB row can't inject CSS.
const SAFE_IMAGE_URL_RE = /^https:\/\/[^\s"')]+$/

// Six picks meant to look polished out of the box — sunsets, jungles,
// graphite. Users who want something specific can edit the two-color
// inputs after picking a preset.
export const GRADIENT_PRESETS: BackgroundGradient[] = [
  { from: '#ff7e5f', to: '#feb47b', angle: 135 },
  { from: '#667eea', to: '#764ba2', angle: 135 },
  { from: '#11998e', to: '#38ef7d', angle: 135 },
  { from: '#fc5c7d', to: '#6a82fb', angle: 135 },
  { from: '#232526', to: '#414345', angle: 135 },
  { from: '#fdc830', to: '#f37335', angle: 135 },
]

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

export function isValidHex(value: unknown): value is string {
  return typeof value === 'string' && HEX_RE.test(value)
}

function clampAngle(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 135
  return ((value % 360) + 360) % 360
}

/**
 * Returns a CSS `background` value (a color or a linear-gradient string)
 * when the user picked a custom background, or `null` to defer to the
 * theme's bg class. Bad / malformed values silently fall through to
 * `null` so a partial DB row never breaks the render.
 */
export function resolveBackgroundCss(
  mode: string | null | undefined,
  value: unknown,
): string | null {
  if (mode === 'solid') {
    const v = value as Partial<BackgroundSolid> | null
    if (v && isValidHex(v.color)) return v.color
    return null
  }
  if (mode === 'gradient') {
    const v = value as Partial<BackgroundGradient> | null
    if (v && isValidHex(v.from) && isValidHex(v.to)) {
      const angle = clampAngle(v.angle)
      return `linear-gradient(${angle}deg, ${v.from}, ${v.to})`
    }
    return null
  }
  if (mode === 'image') {
    const v = value as Partial<BackgroundImage> | null
    if (v && typeof v.url === 'string' && SAFE_IMAGE_URL_RE.test(v.url)) {
      // cover/center so any aspect ratio fills the page; no-repeat so a small
      // image doesn't tile. The card surface sits on top and keeps text legible.
      return `url("${v.url}") center / cover no-repeat`
    }
    return null
  }
  return null
}
