'use client'

import { useEffect, useRef } from 'react'

interface PhotoLightboxProps {
  photos: string[]
  /** Index to land on when the lightbox opens. Defaults to 0. */
  startIndex?: number
  /** Optional caption shown bottom-center, e.g. "Lisbon, Portugal". */
  caption?: string
  onClose: () => void
}

// Full-viewport modal that renders a scroll-snap horizontal carousel of
// photos. Opened from the past-stay thumbnail "+N" badge (so visitors
// can actually see the extra photos) and from the current-stay hero
// for users who want a full-bleed view.
//
// Native scroll-snap means no JS state — keyboard arrow keys, mouse
// scroll, and touch swipe all work for free. We add explicit prev/next
// buttons for desktop users who can't tell the container is scrollable.
//
// Dismiss: ESC key, close button, or click on the backdrop.
export function PhotoLightbox({ photos, startIndex = 0, caption, onClose }: PhotoLightboxProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Land on startIndex (no smooth scroll — we don't want to see the
  // first photo for a moment before jumping). Bind ESC to close.
  useEffect(() => {
    const c = containerRef.current
    if (c) {
      const target = c.children[startIndex] as HTMLElement | undefined
      if (target) c.scrollLeft = target.offsetLeft - c.offsetLeft
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') scrollByDir(-1)
      if (e.key === 'ArrowRight') scrollByDir(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startIndex])

  const scrollByDir = (dir: -1 | 1) => {
    const c = containerRef.current
    if (!c) return
    c.scrollBy({ left: c.clientWidth * dir, behavior: 'smooth' })
  }

  if (photos.length === 0) return null

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={caption || 'Photo gallery'}
      onClick={onClose}
    >
      {/* Close button — outside the carousel's click-stop so the
          backdrop tap-to-close still works around it. */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {photos.length > 1 && (
        <>
          {/* Prev/Next chevrons — hidden on touch devices (where swipe is
              the natural gesture) via hover-not-supported media query.
              `hidden md:flex` shows them at desktop widths. */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              scrollByDir(-1)
            }}
            aria-label="Previous photo"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white hidden md:flex items-center justify-center transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              scrollByDir(1)
            }}
            aria-label="Next photo"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white hidden md:flex items-center justify-center transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      <div
        ref={containerRef}
        // The carousel itself stops backdrop clicks — visitors tapping a
        // photo to zoom shouldn't dismiss the lightbox.
        onClick={(e) => e.stopPropagation()}
        className="w-full h-full overflow-x-auto snap-x snap-mandatory flex"
        role="region"
        aria-label={caption ? `${caption} photos` : 'Photos'}
      >
        {photos.map((url, i) => (
          <div
            key={`${url}-${i}`}
            className="snap-center shrink-0 w-full h-full flex items-center justify-center p-6 sm:p-12"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={caption ? `${caption} — photo ${i + 1} of ${photos.length}` : `Photo ${i + 1}`}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        ))}
      </div>

      {caption && (
        <div className="absolute bottom-6 left-0 right-0 text-center text-white/80 text-sm px-6 pointer-events-none">
          {caption}
        </div>
      )}
    </div>
  )
}
