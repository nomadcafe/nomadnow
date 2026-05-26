import React from 'react'
import type { User } from '@/types/database'
import type { Theme } from '@/lib/themes'
import { OptimizedImage } from '../OptimizedImage'

// Per-theme avatar frame. Branches on theme.avatarStyle so each preset can
// front-load its identity at the top of the card — the avatar is the first
// pixel-block a visitor sees, so this is the highest-leverage place to
// differentiate themes beyond palette swaps.
//
// Variants:
//   - soft-ring   (default): gradient ring + round avatar + white inner ring
//   - square-mono:           square avatar with hard 2px black border, no ring
//   - polaroid:              white card with photo inside, tilted slightly
//   - big-halo:              soft-ring + an extra blurred glow disc behind
export function ThemedAvatar({ user, theme }: { user: User; theme: Theme }) {
  const fallbackInitial = (user.display_name || user.handle).charAt(0).toUpperCase()
  const alt = user.display_name || user.handle

  if (theme.avatarStyle === 'square-mono') {
    return (
      <div className="flex justify-center mb-4 sm:mb-6">
        <div className="w-24 h-24 sm:w-32 sm:h-32 border-2 border-black overflow-hidden bg-white shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
          {user.avatar_url ? (
            <OptimizedImage
              src={user.avatar_url}
              alt={alt}
              width={128}
              height={128}
              className="w-full h-full object-cover"
              priority
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-3xl sm:text-4xl font-mono font-bold text-black"
              style={{ background: `${theme.accentHex}11` }}
            >
              {fallbackInitial}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (theme.avatarStyle === 'polaroid') {
    // Polaroid frame: white border on all sides, extra padding on bottom for
    // the "caption strip" feel. Slight rotation so the card reads as a photo
    // pinned to a page, not a screenshot.
    return (
      <div className="flex justify-center mb-5 sm:mb-7">
        <div className="bg-white p-2 pb-6 sm:p-2.5 sm:pb-7 border border-gray-200 shadow-xl shadow-black/20 -rotate-3">
          <div className="w-24 h-24 sm:w-28 sm:h-28 overflow-hidden bg-gray-50">
            {user.avatar_url ? (
              <OptimizedImage
                src={user.avatar_url}
                alt={alt}
                width={112}
                height={112}
                className="w-full h-full object-cover"
                priority
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-3xl sm:text-4xl font-semibold text-white"
                style={{
                  background: `linear-gradient(135deg, ${theme.accentHex}, ${theme.accentHex}99)`,
                }}
              >
                {fallbackInitial}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (theme.avatarStyle === 'big-halo') {
    // Layered glow: a fat blurred disc directly behind the avatar reads
    // as Y2K "internet glow" without relying on the card-level decoration
    // alone. Sits on top of the card-level halo so the avatar pops twice.
    return (
      <div className="relative flex justify-center mb-4 sm:mb-6">
        <div
          aria-hidden
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 sm:w-56 sm:h-56 rounded-full opacity-60 blur-2xl pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${theme.accentHex} 0%, transparent 70%)`,
          }}
        />
        <div
          className="relative rounded-full p-[3px] shadow-lg shadow-black/20"
          style={{
            background: `linear-gradient(135deg, ${theme.accentHex}55, ${theme.accentHex}22)`,
          }}
        >
          {user.avatar_url ? (
            <OptimizedImage
              src={user.avatar_url}
              alt={alt}
              width={128}
              height={128}
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover ring-2 ring-white/40 block"
              priority
            />
          ) : (
            <div
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center text-3xl sm:text-4xl font-semibold text-white ring-2 ring-white/40"
              style={{
                background: `linear-gradient(135deg, ${theme.accentHex}, ${theme.accentHex}99)`,
              }}
            >
              {fallbackInitial}
            </div>
          )}
        </div>
      </div>
    )
  }

  // soft-ring (default): gradient halo around a round avatar with a white
  // inner ring. Same as the original baseline before per-theme variants.
  return (
    <div className="flex justify-center mb-4 sm:mb-6">
      <div
        className="relative rounded-full p-[3px] shadow-lg shadow-black/10"
        style={{
          background: `linear-gradient(135deg, ${theme.accentHex}33, ${theme.accentHex}11)`,
        }}
      >
        {user.avatar_url ? (
          <OptimizedImage
            src={user.avatar_url}
            alt={alt}
            width={128}
            height={128}
            className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover ring-2 ring-white/80 block"
            priority
          />
        ) : (
          <div
            className="w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center text-3xl sm:text-4xl font-semibold text-white ring-2 ring-white/80"
            style={{
              background: `linear-gradient(135deg, ${theme.accentHex}, ${theme.accentHex}99)`,
            }}
          >
            {fallbackInitial}
          </div>
        )}
      </div>
    </div>
  )
}
