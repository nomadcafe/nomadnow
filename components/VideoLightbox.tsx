'use client'

import { useEffect } from 'react'

// Full-screen modal that embeds a YouTube / Vimeo player so a video link
// on someone's card plays in place instead of bouncing the visitor off the
// page. Esc + click-outside close it; the iframe gets autoplay=1 so it
// starts playing as soon as the modal opens.
export function VideoLightbox({
  url,
  onClose,
}: {
  url: string
  onClose: () => void
}) {
  useEffect(() => {
    // Esc-to-close. Re-attaches on each lightbox open so we don't leak the
    // listener after the modal unmounts.
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    // Prevent body scroll while modal is open so the page doesn't slip
    // around underneath the player.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Video player"
      onClick={onClose}
      className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div
        // Stop propagation so clicking inside the player area doesn't close
        // the modal — only the backdrop should.
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl"
      >
        <iframe
          src={url}
          title="Video player"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// URL detection / embed-URL builders. Exported so other surfaces (e.g. the
// link-icon picker) could reuse them later.
// ----------------------------------------------------------------------------

export type VideoProvider = 'youtube' | 'vimeo'

export interface VideoMatch {
  provider: VideoProvider
  id: string
  embedUrl: string
}

export function detectVideo(url: string): VideoMatch | null {
  if (!url) return null
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return null
  }
  const host = u.hostname.toLowerCase()
  const path = u.pathname

  // YouTube: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID,
  // youtube.com/embed/ID. Strip any leading slash and trailing path parts.
  if (host === 'youtu.be') {
    const id = path.slice(1).split('/')[0]
    if (id) return ytMatch(id)
  }
  if (host === 'youtube.com' || host === 'www.youtube.com' || host === 'm.youtube.com') {
    const v = u.searchParams.get('v')
    if (v) return ytMatch(v)
    const segments = path.split('/').filter(Boolean)
    // shorts/ID or embed/ID
    if (segments.length >= 2 && (segments[0] === 'shorts' || segments[0] === 'embed')) {
      return ytMatch(segments[1])
    }
  }

  // Vimeo: vimeo.com/{id} or player.vimeo.com/video/{id}
  if (host === 'vimeo.com' || host === 'www.vimeo.com') {
    const id = path.split('/').filter(Boolean)[0]
    if (id && /^\d+$/.test(id)) return vimeoMatch(id)
  }
  if (host === 'player.vimeo.com') {
    const segments = path.split('/').filter(Boolean)
    const id = segments[segments.length - 1]
    if (id && /^\d+$/.test(id)) return vimeoMatch(id)
  }
  return null
}

function ytMatch(id: string): VideoMatch {
  // rel=0 trims related-video recommendations after playback; autoplay=1
  // matches the click-to-play expectation since we only mount the iframe
  // when the user has explicitly opened the lightbox.
  return {
    provider: 'youtube',
    id,
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`,
  }
}

function vimeoMatch(id: string): VideoMatch {
  return {
    provider: 'vimeo',
    id,
    embedUrl: `https://player.vimeo.com/video/${id}?autoplay=1`,
  }
}
