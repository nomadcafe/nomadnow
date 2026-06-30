// Curated Google Fonts the user can opt into. Each Theme already has a
// font Tailwind class (`font-serif`, `font-mono`, or '' for system); when
// the user picks one of these, we OVERRIDE the theme's font on the
// NomadCard wrapper.
//
// next/font runs at module scope at build time — importing this file is
// what triggers each font to be bundled. We use preload: false because
// JA/ZH visitors fall back to system fonts (these are Latin-only faces)
// and the head-of-page preload would just be wasted bandwidth for them.

import {
  Plus_Jakarta_Sans,
  Fraunces,
  JetBrains_Mono,
  Inter,
  Space_Grotesk,
  DM_Serif_Display,
  Caveat,
} from 'next/font/google'

const inter = Inter({ subsets: ['latin'], display: 'swap', preload: false })
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], display: 'swap', preload: false })
const fraunces = Fraunces({ subsets: ['latin'], display: 'swap', preload: false })
const mono = JetBrains_Mono({ subsets: ['latin'], display: 'swap', preload: false })
// Personality faces: a geometric sans, a high-contrast display serif, and a
// handwritten marker (the warm/personal one — well suited to a one-person card).
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], display: 'swap', preload: false })
const dmSerif = DM_Serif_Display({ subsets: ['latin'], weight: '400', display: 'swap', preload: false })
const caveat = Caveat({ subsets: ['latin'], display: 'swap', preload: false })

export type FontKey =
  | 'theme'
  | 'inter'
  | 'jakarta'
  | 'fraunces'
  | 'mono'
  | 'space'
  | 'dmserif'
  | 'caveat'
export const FONT_KEYS = ['theme', 'inter', 'jakarta', 'fraunces', 'mono', 'space', 'dmserif', 'caveat'] as const

export interface FontOption {
  key: FontKey
  // Human-readable label shown next to the preview. Universal Latin
  // names, no translation needed.
  label: string
  // CSS class produced by next/font. Empty string for 'theme' so the
  // caller falls through to the theme's own font class.
  className: string
}

export const FONT_OPTIONS: FontOption[] = [
  { key: 'theme', label: 'Theme default', className: '' },
  { key: 'inter', label: 'Inter', className: inter.className },
  { key: 'jakarta', label: 'Jakarta Sans', className: jakarta.className },
  { key: 'fraunces', label: 'Fraunces', className: fraunces.className },
  { key: 'mono', label: 'JetBrains Mono', className: mono.className },
  { key: 'space', label: 'Space Grotesk', className: spaceGrotesk.className },
  { key: 'dmserif', label: 'DM Serif Display', className: dmSerif.className },
  { key: 'caveat', label: 'Caveat', className: caveat.className },
]

const BY_KEY: Record<string, string> = Object.fromEntries(
  FONT_OPTIONS.map((o) => [o.key, o.className]),
)

/**
 * Looks up the next/font className for a stored font key. Returns empty
 * string for 'theme' (or any unknown value) so the caller can fall
 * back to the theme's font class without a special case.
 */
export function getFontClassName(key?: string | null): string {
  if (!key) return ''
  return BY_KEY[key] ?? ''
}
