import React from 'react'
import type { ThemeDecoration as Variant } from '@/lib/themes'

// Per-theme background overlay rendered inside the card. Each variant is
// pure CSS / SVG — no client state — so this stays a server component.
// The parent card uses `relative` and a `z-10` content layer, so all
// decorations sit at the bottom of the stack and never block clicks.
//
// Keep decorations subtle: they are meant to give each theme a recognizable
// signature, not to fight for attention with the actual content. Most use
// blur, low opacity, or alpha-blended gradients.
export function ThemeDecoration({
  variant,
  accentHex,
}: {
  variant: Variant
  // Only used by 'accent-glow' — the theme's resolved accent (or the user's
  // accent override). Other variants use their own fixed palette.
  accentHex?: string
}) {
  switch (variant) {
    case 'none':
      return null

    case 'accent-glow': {
      // Soft radial halo above the avatar in the theme's own accent — the
      // accent-matched cousin of midnight-glow / vivid-halo. `99` ≈ 60% alpha.
      const glow = accentHex || '#888888'
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute -top-20 left-1/2 -translate-x-1/2 w-[30rem] h-[30rem] rounded-full opacity-30 blur-3xl"
            style={{ background: `radial-gradient(circle, ${glow}99 0%, transparent 70%)` }}
          />
        </div>
      )
    }

    case 'midnight-glow':
      // Soft cyan radial halo centered above the avatar — picks up the
      // theme's accent (#22d3ee) and reads as "ambient screen glow".
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute -top-20 left-1/2 -translate-x-1/2 w-[28rem] h-[28rem] rounded-full opacity-30 blur-3xl"
            style={{
              background:
                'radial-gradient(circle, rgba(34,211,238,0.6) 0%, transparent 70%)',
            }}
          />
        </div>
      )

    case 'sunset-band':
      // Two-layer sunset:
      //   1. A warm radial "sun" lowering at the top-right — the strongest
      //      sunset signal, sits behind the avatar/name without crowding
      //      them (off-center horizontally so it reads as a setting sun,
      //      not a halo around the user's head).
      //   2. A saturated horizon ribbon at the very bottom — picks up the
      //      "magazine issue" feel of the original variant without
      //      relying on it as the sole sunset cue.
      // The previous variant was just the thin ribbon; combined with a
      // pastel page bg, the theme read as "cream" rather than "sunset".
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute -top-32 -right-20 w-[34rem] h-[34rem] rounded-full opacity-55 blur-3xl"
            style={{
              background:
                'radial-gradient(circle, rgba(251,146,60,0.85) 0%, rgba(244,114,182,0.45) 45%, transparent 72%)',
            }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-2 opacity-80"
            style={{
              background:
                'linear-gradient(90deg, #fb923c 0%, #f472b6 50%, #fbbf24 100%)',
            }}
          />
        </div>
      )

    case 'mono-grid':
      // 24px square grid at ~4% opacity. Reads as engineering-graph-paper
      // background — supports the brutalist mono aesthetic without ever
      // crossing into "loud".
      return (
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(to right, black 1px, transparent 1px), linear-gradient(to bottom, black 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
      )

    case 'vivid-halo':
      // Yellow-to-magenta blur disc behind the avatar — leans into the Y2K
      // "internet glow" mood. Wider and brighter than midnight-glow.
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute -top-16 left-1/2 -translate-x-1/2 w-[32rem] h-[32rem] rounded-full opacity-60 blur-3xl"
            style={{
              background:
                'radial-gradient(circle, rgba(253,224,71,0.7) 0%, rgba(244,114,182,0.5) 40%, transparent 70%)',
            }}
          />
        </div>
      )

    case 'forest-leaves':
      // Two-layer forest decoration:
      //   1. Dappled canopy light — a warm mint radial at top-left
      //      suggesting sunlight piercing through leaves. Compounds with
      //      the leaf shapes below so the card reads as "in a forest"
      //      rather than just "dark green card".
      //   2. Two corner leaf silhouettes, now at emerald-400 / opacity
      //      0.22 instead of emerald-700 / 0.12. The earlier values
      //      put mid-green leaves on very-dark-green bg at 12% opacity —
      //      effectively invisible. Lighter color + higher opacity makes
      //      the silhouettes actually readable while still subtle enough
      //      to not compete with the content.
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute -top-32 -left-20 w-[28rem] h-[28rem] rounded-full opacity-30 blur-3xl"
            style={{
              background:
                'radial-gradient(circle, rgba(110,231,183,0.55) 0%, transparent 70%)',
            }}
          />
          <div
            aria-hidden
            className="absolute inset-0 text-emerald-400 opacity-[0.22]"
          >
            <svg
              className="absolute -top-6 -right-6 w-32 h-32"
              viewBox="0 0 64 64"
              fill="currentColor"
            >
              <path d="M32 4C16 8 4 22 4 38c0 14 10 22 22 22 4 0 8-1 12-3-8-2-14-8-16-16 6 2 14 0 20-6 8-8 8-22-10-31z" />
            </svg>
            <svg
              className="absolute -bottom-6 -left-6 w-28 h-28 rotate-180"
              viewBox="0 0 64 64"
              fill="currentColor"
            >
              <path d="M32 4C16 8 4 22 4 38c0 14 10 22 22 22 4 0 8-1 12-3-8-2-14-8-16-16 6 2 14 0 20-6 8-8 8-22-10-31z" />
            </svg>
          </div>
        </div>
      )

    case 'cream-paper':
      // SVG fractal-noise filter applied to a transparent rect — gives the
      // surface a real grainy paper texture. Cheap (no image asset) and
      // resolution-independent.
      return (
        <svg
          aria-hidden
          className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.07] mix-blend-multiply"
        >
          <filter id="cream-paper-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.27
                      0 0 0 0 0.10
                      0 0 0 0 0.01
                      0 0 0 1 0"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#cream-paper-noise)" />
        </svg>
      )

    default: {
      // Exhaustiveness check — if a new variant is added to the union and
      // not handled here, TS will fail this assignment.
      const _exhaustive: never = variant
      return _exhaustive
    }
  }
}
