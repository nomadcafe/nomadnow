'use client'

import { useState } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'

const PhotoLightbox = dynamic(
  () => import('../PhotoLightbox').then((m) => ({ default: m.PhotoLightbox })),
  { ssr: false },
)

interface Props {
  photos: string[]
  caption: string
}

// 48px clickable thumbnail for a past stay row — opens the lightbox. The
// "+N" badge over the corner signals additional photos. Each thumbnail
// owns its own lightbox state so the parent stays render-only and one
// list can have many independent thumbnails. PhotoLightbox itself is
// lazy-loaded, so a never-clicked timeline never pays for its code.
export function PastStayThumbnail({ photos, caption }: Props) {
  const [open, setOpen] = useState(false)
  if (photos.length === 0) return null
  const firstPhoto = photos[0]
  const extra = photos.length - 1

  return (
    <>
      {open && (
        <PhotoLightbox
          photos={photos}
          startIndex={0}
          caption={caption}
          onClose={() => setOpen(false)}
        />
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Open photos for ${caption}`}
        className="relative w-12 h-12 shrink-0 rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-gray-400 transition hover:opacity-90"
      >
        <Image
          src={firstPhoto}
          alt={caption}
          width={48}
          height={48}
          sizes="48px"
          className="w-12 h-12 object-cover"
        />
        {extra > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-black/70 text-white backdrop-blur-sm">
            +{extra}
          </span>
        )}
      </button>
    </>
  )
}
