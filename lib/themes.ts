// Theme presets for the Nomad Card. Each preset is a self-contained look —
// background, card surface, accent, button style, and font family — applied as
// a single choice in /settings rather than per-property knobs.
//
// The DB column `profile_settings.theme_color` stores the preset key (legacy name).

export type ThemeKey =
  | 'classic'
  | 'midnight'
  | 'sunset'
  | 'mono'
  | 'vivid'
  | 'forest'
  | 'cream'

// Button shape preset — orthogonal to theme color so users can pair any
// theme with any shape. Stored in profile_settings.button_shape.
export type ButtonShape = 'pill' | 'rounded' | 'square'
export const BUTTON_SHAPE_KEYS = ['pill', 'rounded', 'square'] as const

export interface ButtonShapeClasses {
  /** Outer link row corner radius. */
  row: string
  /** Inner brand-icon chip corner radius — kept consistent with the row. */
  chip: string
}

const BUTTON_SHAPE_CLASS_MAP: Record<ButtonShape, ButtonShapeClasses> = {
  pill: { row: 'rounded-full', chip: 'rounded-full' },
  rounded: { row: 'rounded-xl', chip: 'rounded-lg' },
  square: { row: 'rounded-none', chip: 'rounded-none' },
}

export function getButtonShape(shape?: string | null): ButtonShapeClasses {
  if (shape && shape in BUTTON_SHAPE_CLASS_MAP) {
    return BUTTON_SHAPE_CLASS_MAP[shape as ButtonShape]
  }
  return BUTTON_SHAPE_CLASS_MAP.rounded
}

// CSS values applied via inline style by app/og/[handle]/route.tsx.
// satori cannot use Tailwind classes, so each theme needs raw CSS too.
export interface ThemeOg {
  // Background of the OG canvas. Can be a solid color or a gradient.
  bg: string
  // Primary text color.
  fg: string
  // Secondary / muted text.
  muted: string
  // Border/rule color for the stat-strip dividers.
  divider: string
  // Verified pill background + text.
  pillBg: string
  pillFg: string
  pillBorder: string
  // Wordmark `nomad.now/` opaque-text color (for the bold handle part).
  brandFg: string
  // Optional font-family CSS string. Falls back to system sans-serif.
  fontFamily?: string
}

// Background decoration variant rendered inside the card via
// components/nomad-card/ThemeDecoration.tsx. Drives the per-theme "feel"
// (gradient band / grid / halo / leaf / paper grain). 'none' = no overlay.
export type ThemeDecoration =
  | 'none'
  | 'midnight-glow'
  | 'sunset-band'
  | 'mono-grid'
  | 'vivid-halo'
  | 'forest-leaves'
  | 'cream-paper'

// Avatar frame variant. Rendered by components/nomad-card/ThemedAvatar.tsx.
// soft-ring = default gradient halo around a round image. Other variants
// reshape the frame to match the theme identity (square brutalist, polaroid
// rotate, extra layered glow).
export type ThemeAvatarStyle = 'soft-ring' | 'square-mono' | 'polaroid' | 'big-halo'

// Bio quote-mark variant. 'classic' = stylised " " typography quotes;
// 'brackets' = monospace `[ ]` for the brutalist theme.
export type ThemeBioQuoteStyle = 'classic' | 'brackets'

export interface Theme {
  key: ThemeKey
  label: string
  accentHex: string

  // ─── DOM tokens (Tailwind classes for components/NomadCard.tsx) ───────────
  page: string
  card: string
  text: string
  textMuted: string
  bioQuote: string
  pillVerified: string
  pillNeutral: string
  linkRow: string
  // Hover effect for the link row — translate / shadow / glow classes
  // applied on hover. Each theme picks a language consistent with its own
  // identity (brutalist hard shadow, Y2K glow, magazine warm shadow, etc.)
  // rather than sharing a generic "hover:shadow-md + lift".
  linkHover: string
  linkArrow: string
  divider: string
  font: string

  // ─── Typography per theme. Empty string falls through to the section
  // renderer's default, so themes that want neutral baseline (Classic /
  // Midnight) don't have to fill these in. ────────────────────────────
  // Override for the user's display_name <h1>. Set the full class string;
  // section renderer uses theme.nameClass || <default> so empty means default.
  nameClass: string
  // Appended (not replaced) to the role text class. Used to add things like
  // italic / uppercase / tracking that should sit on top of the muted color.
  roleClass: string
  // Background decoration rendered inside the card. See ThemeDecoration.
  decoration: ThemeDecoration
  // Avatar frame style. See ThemedAvatar.
  avatarStyle: ThemeAvatarStyle
  // Bio quote-mark variant.
  bioQuoteStyle: ThemeBioQuoteStyle
  // Override for the stats strip's number size — empty string = default.
  // Used by themes that want a louder ("text-3xl ...") or more compact
  // stat presentation than the baseline.
  statValueClass: string

  blurb: string

  // ─── OG image tokens (raw CSS values for satori) ─────────────────────────
  og: ThemeOg
}

export const THEMES: Record<ThemeKey, Theme> = {
  classic: {
    key: 'classic',
    label: 'Classic',
    accentHex: '#3b82f6',
    page: 'bg-white',
    card: 'bg-white border border-gray-200 rounded-2xl shadow-sm',
    text: 'text-gray-900',
    textMuted: 'text-gray-500',
    bioQuote: 'text-gray-700',
    pillVerified: 'bg-green-50 text-green-700 border border-green-100',
    pillNeutral: 'bg-gray-100 text-gray-700',
    linkRow: 'bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-900',
    linkHover: 'motion-safe:hover:-translate-y-0.5 hover:shadow-md',
    linkArrow: 'text-gray-400 group-hover:text-gray-600',
    divider: 'border-gray-100',
    font: '',
    nameClass: '',
    roleClass: '',
    decoration: 'none',
    avatarStyle: 'soft-ring',
    bioQuoteStyle: 'classic',
    statValueClass: '',
    blurb: 'Clean, neutral, the default.',
    og: {
      bg: 'white',
      fg: '#111827',
      muted: '#6b7280',
      divider: '#f3f4f6',
      pillBg: '#ecfdf5',
      pillFg: '#047857',
      pillBorder: '#a7f3d0',
      brandFg: '#111827',
    },
  },
  midnight: {
    key: 'midnight',
    label: 'Midnight',
    accentHex: '#22d3ee',
    page: 'bg-gray-950',
    card: 'bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl shadow-black/40',
    text: 'text-white',
    textMuted: 'text-gray-400',
    bioQuote: 'text-gray-300',
    pillVerified: 'bg-cyan-950/60 text-cyan-300 border border-cyan-900',
    pillNeutral: 'bg-gray-800 text-gray-300 border border-gray-700',
    linkRow: 'bg-gray-800/60 hover:bg-gray-800 border border-gray-700 text-white',
    // Tech product hover: subtle lift + cyan-tinted glow picks up the accent.
    linkHover: 'motion-safe:hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-500/20',
    linkArrow: 'text-gray-500 group-hover:text-gray-300',
    divider: 'border-gray-800',
    font: '',
    nameClass: '',
    roleClass: '',
    decoration: 'midnight-glow',
    avatarStyle: 'soft-ring',
    bioQuoteStyle: 'classic',
    statValueClass: '',
    blurb: 'Deep dark with neon accent.',
    og: {
      bg: 'linear-gradient(135deg, #030712 0%, #111827 100%)',
      fg: '#ffffff',
      muted: '#9ca3af',
      divider: '#1f2937',
      pillBg: 'rgba(34, 211, 238, 0.12)',
      pillFg: '#67e8f9',
      pillBorder: 'rgba(34, 211, 238, 0.35)',
      brandFg: '#ffffff',
    },
  },
  sunset: {
    key: 'sunset',
    label: 'Sunset',
    accentHex: '#f97316',
    page: 'bg-gradient-to-br from-orange-50 via-pink-50 to-amber-50',
    card: 'bg-white/70 backdrop-blur-md border border-orange-100/80 rounded-3xl shadow-lg shadow-orange-200/40',
    text: 'text-stone-900',
    textMuted: 'text-stone-500',
    bioQuote: 'text-stone-700',
    pillVerified: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    pillNeutral: 'bg-orange-100/70 text-orange-900 border border-orange-200/60',
    linkRow: 'bg-white/60 hover:bg-white/90 backdrop-blur border border-orange-100 text-stone-900',
    // Magazine warm-lit hover: lift + soft orange shadow.
    linkHover: 'motion-safe:hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orange-400/30',
    linkArrow: 'text-stone-400 group-hover:text-stone-600',
    divider: 'border-orange-100',
    font: 'font-serif',
    // Magazine vibe: bigger serif headline, lighter weight, italic role.
    nameClass: 'text-3xl sm:text-4xl md:text-5xl font-serif font-light tracking-tight mb-1 sm:mb-2',
    roleClass: 'italic font-serif',
    decoration: 'sunset-band',
    avatarStyle: 'polaroid',
    bioQuoteStyle: 'classic',
    statValueClass: '',
    blurb: 'Warm gradient, serif type, travel-mag feel.',
    og: {
      bg: 'linear-gradient(135deg, #fff7ed 0%, #fce7f3 50%, #fef3c7 100%)',
      fg: '#1c1917',
      muted: '#78716c',
      divider: '#fed7aa',
      pillBg: '#ecfdf5',
      pillFg: '#047857',
      pillBorder: '#a7f3d0',
      brandFg: '#1c1917',
      fontFamily: 'Georgia, "Times New Roman", serif',
    },
  },
  mono: {
    key: 'mono',
    label: 'Mono',
    accentHex: '#000000',
    page: 'bg-white',
    card: 'bg-white border-2 border-black rounded-none shadow-[6px_6px_0_0_rgba(0,0,0,1)]',
    text: 'text-black',
    textMuted: 'text-gray-600',
    bioQuote: 'text-black',
    pillVerified: 'bg-white text-black border-2 border-black',
    pillNeutral: 'bg-white text-black border-2 border-black',
    linkRow: 'bg-white hover:bg-gray-50 border-2 border-black text-black',
    // Brutalist hard-stamp hover: button moves up-and-left a hair while a
    // crisp 4px offset black shadow appears down-and-right. Matches the
    // card's own hard offset shadow language.
    linkHover: 'motion-safe:hover:-translate-x-0.5 motion-safe:hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)]',
    linkArrow: 'text-black',
    divider: 'border-black',
    font: 'font-mono',
    // Brutalist: all-caps mono name, mono uppercase role with wide tracking.
    nameClass: 'text-2xl sm:text-3xl md:text-4xl font-mono font-bold tracking-tight uppercase mb-1 sm:mb-2',
    roleClass: 'font-mono uppercase tracking-widest text-xs sm:text-sm',
    decoration: 'mono-grid',
    avatarStyle: 'square-mono',
    bioQuoteStyle: 'brackets',
    // Bigger tabular numerals — terminal-readout vibe.
    statValueClass: 'text-3xl sm:text-4xl font-mono font-bold tabular-nums',
    blurb: 'Brutalist mono with hard edges.',
    og: {
      bg: 'white',
      fg: '#000000',
      muted: '#4b5563',
      divider: '#000000',
      pillBg: '#ffffff',
      pillFg: '#000000',
      pillBorder: '#000000',
      brandFg: '#000000',
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    },
  },
  vivid: {
    key: 'vivid',
    label: 'Vivid',
    accentHex: '#fde047',
    page: 'bg-gradient-to-br from-fuchsia-500 via-purple-500 to-violet-600',
    card: 'bg-white/15 backdrop-blur-xl border border-white/30 rounded-3xl shadow-2xl shadow-purple-900/40',
    text: 'text-white',
    textMuted: 'text-white/70',
    bioQuote: 'text-white/90',
    pillVerified: 'bg-yellow-300/20 text-yellow-100 border border-yellow-300/40',
    pillNeutral: 'bg-white/20 text-white border border-white/30',
    linkRow: 'bg-white/15 hover:bg-white/25 backdrop-blur border border-white/30 text-white',
    // Y2K bright-glow hover: micro scale + a wide yellow halo around the row.
    linkHover: 'motion-safe:hover:scale-[1.02] hover:shadow-[0_0_28px_4px_rgba(253,224,71,0.35)]',
    linkArrow: 'text-white/60 group-hover:text-white/90',
    divider: 'border-white/20',
    font: '',
    // Y2K display: oversized tight-tracked name, small uppercase role.
    nameClass: 'text-3xl sm:text-5xl md:text-6xl font-bold tracking-tighter leading-none mb-1 sm:mb-2',
    roleClass: 'uppercase tracking-wide text-sm sm:text-base',
    decoration: 'vivid-halo',
    avatarStyle: 'big-halo',
    bioQuoteStyle: 'classic',
    // Bigger numbers to match the oversized headline language.
    statValueClass: 'text-3xl sm:text-5xl font-bold tabular-nums',
    blurb: 'Bold gradient with glass card.',
    og: {
      bg: 'linear-gradient(135deg, #d946ef 0%, #a855f7 50%, #7c3aed 100%)',
      fg: '#ffffff',
      muted: 'rgba(255, 255, 255, 0.7)',
      divider: 'rgba(255, 255, 255, 0.2)',
      pillBg: 'rgba(253, 224, 71, 0.18)',
      pillFg: '#fef3c7',
      pillBorder: 'rgba(253, 224, 71, 0.4)',
      brandFg: '#ffffff',
    },
  },
  forest: {
    key: 'forest',
    label: 'Forest',
    accentHex: '#34d399',
    page: 'bg-emerald-950',
    card: 'bg-emerald-900/70 border border-emerald-800 rounded-2xl shadow-2xl shadow-black/50',
    text: 'text-emerald-50',
    textMuted: 'text-emerald-300/70',
    bioQuote: 'text-emerald-100',
    pillVerified: 'bg-emerald-800/60 text-emerald-200 border border-emerald-700',
    pillNeutral: 'bg-emerald-900 text-emerald-200 border border-emerald-800',
    linkRow: 'bg-emerald-900/50 hover:bg-emerald-900 border border-emerald-800 text-emerald-50',
    // Grounded slow hover: gentle lift + deep emerald shadow.
    linkHover: 'motion-safe:hover:-translate-y-0.5 hover:shadow-md hover:shadow-emerald-900/40',
    linkArrow: 'text-emerald-500 group-hover:text-emerald-300',
    divider: 'border-emerald-800/60',
    font: '',
    // Slow / grounded: serif headline at default size, italic serif role.
    nameClass: 'text-2xl sm:text-3xl md:text-4xl font-serif font-medium tracking-tight mb-1 sm:mb-2',
    roleClass: 'italic font-serif',
    decoration: 'forest-leaves',
    avatarStyle: 'soft-ring',
    bioQuoteStyle: 'classic',
    statValueClass: '',
    blurb: 'Deep green, slow & grounded.',
    og: {
      bg: 'linear-gradient(135deg, #022c22 0%, #064e3b 100%)',
      fg: '#ecfdf5',
      muted: '#6ee7b7',
      divider: '#065f46',
      pillBg: 'rgba(52, 211, 153, 0.15)',
      pillFg: '#a7f3d0',
      pillBorder: 'rgba(52, 211, 153, 0.4)',
      brandFg: '#ecfdf5',
    },
  },
  cream: {
    key: 'cream',
    label: 'Cream',
    accentHex: '#92400e',
    page: 'bg-amber-50',
    card: 'bg-white/80 backdrop-blur border border-amber-200/60 rounded-3xl shadow-md shadow-amber-200/40',
    text: 'text-amber-950',
    textMuted: 'text-amber-800/60',
    bioQuote: 'text-amber-900',
    pillVerified: 'bg-amber-100 text-amber-900 border border-amber-300',
    pillNeutral: 'bg-amber-50 text-amber-900 border border-amber-200',
    linkRow: 'bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-950',
    // Notebook quiet hover: no translate, only a soft warm shadow whisper.
    linkHover: 'hover:shadow-sm hover:shadow-amber-300/40',
    linkArrow: 'text-amber-700 group-hover:text-amber-900',
    divider: 'border-amber-200',
    font: 'font-serif',
    // Notebook: smaller serif name (less assertive than Sunset), italic role.
    nameClass: 'text-2xl sm:text-3xl md:text-4xl font-serif font-normal tracking-normal mb-1 sm:mb-2',
    roleClass: 'italic font-serif text-sm sm:text-base',
    decoration: 'cream-paper',
    avatarStyle: 'soft-ring',
    bioQuoteStyle: 'classic',
    statValueClass: '',
    blurb: 'Soft paper-and-coffee feel.',
    og: {
      bg: '#fffbeb',
      fg: '#451a03',
      muted: '#a16207',
      divider: '#fde68a',
      pillBg: '#fef3c7',
      pillFg: '#78350f',
      pillBorder: '#fcd34d',
      brandFg: '#451a03',
      fontFamily: 'Georgia, "Times New Roman", serif',
    },
  },
}

// Accent override format. Accepts #RGB / #RRGGBB / #RRGGBBAA — same lenient
// shape as background_value's color fields. Anything else is dropped silently
// so a malformed value can't break the card render; the preset's accentHex
// survives unchanged.
const ACCENT_HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

// Catalogs of valid override values for the three discrete theme axes.
// Re-exported so the /api/settings Zod schema and the /settings UI segmented
// pickers can share the same source of truth. Keep these in lockstep with
// the type unions above (ThemeDecoration / ThemeAvatarStyle / etc.) — adding
// a value in one place but not the other will silently drop overrides.
export const DECORATION_KEYS = [
  'none',
  'midnight-glow',
  'sunset-band',
  'mono-grid',
  'vivid-halo',
  'forest-leaves',
  'cream-paper',
] as const satisfies readonly ThemeDecoration[]

export const AVATAR_STYLE_KEYS = [
  'soft-ring',
  'square-mono',
  'polaroid',
  'big-halo',
] as const satisfies readonly ThemeAvatarStyle[]

export const BIO_QUOTE_STYLE_KEYS = [
  'classic',
  'brackets',
] as const satisfies readonly ThemeBioQuoteStyle[]

const DECORATION_SET: ReadonlySet<string> = new Set<string>(DECORATION_KEYS)
const AVATAR_STYLE_SET: ReadonlySet<string> = new Set<string>(AVATAR_STYLE_KEYS)
const BIO_QUOTE_STYLE_SET: ReadonlySet<string> = new Set<string>(BIO_QUOTE_STYLE_KEYS)

// Optional per-axis overrides applied on top of a chosen preset. Each null /
// undefined / unknown value falls through to the preset's baked-in choice.
// Lets users mix-and-match (e.g. Classic palette + mono-grid decoration +
// polaroid avatar) without us having to ship every combination as a preset.
export interface ThemeOverrides {
  accent?: string | null
  decoration?: string | null
  avatarStyle?: string | null
  bioQuoteStyle?: string | null
}

export function getTheme(
  key: string | undefined | null,
  overrides?: ThemeOverrides | null,
): Theme {
  const base = key && key in THEMES ? THEMES[key as ThemeKey] : THEMES.classic
  if (!overrides) return base

  // Build a single shallow-clone with all valid overrides applied. We
  // never mutate the singleton THEMES record — server renders reuse the
  // same module instance across requests, so an in-place edit would leak
  // one user's overrides to the next visitor.
  const out: Theme = { ...base }
  let touched = false

  if (overrides.accent && ACCENT_HEX.test(overrides.accent)) {
    out.accentHex = overrides.accent
    touched = true
  }
  if (overrides.decoration && DECORATION_SET.has(overrides.decoration)) {
    out.decoration = overrides.decoration as ThemeDecoration
    touched = true
  }
  if (overrides.avatarStyle && AVATAR_STYLE_SET.has(overrides.avatarStyle)) {
    out.avatarStyle = overrides.avatarStyle as ThemeAvatarStyle
    touched = true
  }
  if (overrides.bioQuoteStyle && BIO_QUOTE_STYLE_SET.has(overrides.bioQuoteStyle)) {
    out.bioQuoteStyle = overrides.bioQuoteStyle as ThemeBioQuoteStyle
    touched = true
  }

  return touched ? out : base
}

export const THEME_KEYS = Object.keys(THEMES) as ThemeKey[]
