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

// Photo banner for the "current stay" card section — either a single hero
// image or a horizontal scroll-snap carousel. Wraps the lightbox state for
// the photos rendered here. Returns null when there are no photos so the
// parent (server-rendered) text block sits flush.
export function CurrentStayPhotos({ photos, caption }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  if (photos.length === 0) return null

  return (
    <>
      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          startIndex={lightboxIndex}
          caption={caption}
          onClose={() => setLightboxIndex(null)}
        />
      )}
      {photos.length === 1 ? (
        <button
          type="button"
          onClick={() => setLightboxIndex(0)}
          className="block w-full text-left focus:outline-none focus:ring-2 focus:ring-white/40"
          aria-label={`Open ${caption} photo`}
        >
          <div className="relative w-full h-40 sm:h-48">
            <Image
              src={photos[0]}
              alt={caption}
              fill
              sizes="(max-width: 640px) 100vw, 640px"
              className="object-cover"
            />
          </div>
        </button>
      ) : (
        <div className="relative" role="region" aria-label={`${caption} photos`}>
          <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-thin">
            {photos.map((url, i) => (
              <button
                type="button"
                key={`${url}-${i}`}
                onClick={() => setLightboxIndex(i)}
                className="snap-start shrink-0 w-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white/40"
                aria-label={`Open photo ${i + 1} of ${photos.length}`}
              >
                <div className="relative w-full h-40 sm:h-48">
                  <Image
                    src={url}
                    alt={`${caption} — photo ${i + 1} of ${photos.length}`}
                    fill
                    sizes="(max-width: 640px) 100vw, 640px"
                    className="object-cover"
                  />
                </div>
              </button>
            ))}
          </div>
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/60 text-white backdrop-blur-sm pointer-events-none">
            {photos.length}
          </div>
        </div>
      )}
    </>
  )
}
