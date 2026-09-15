'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { isAllowedImageUrl } from '@/lib/image-hosts'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
}

export function OptimizedImage({
  src,
  alt,
  width = 64,
  height = 64,
  className = '',
  priority = false,
  placeholder = 'empty',
  blurDataURL,
}: OptimizedImageProps) {
  const [imageError, setImageError] = useState(false)

  // For external URLs, use regular img tag with lazy loading and error handling.
  //
  // NB: this branch, not the <Image> one below, is what every stored image
  // actually takes — avatars, backgrounds and stay photos are all absolute
  // Supabase Storage URLs, and only relative paths fall through to next/image.
  // That means next.config's `images.remotePatterns` never sees them, so the
  // host check has to happen here. A URL on any other host renders the
  // placeholder and issues NO request: an <img> pointed at an arbitrary host
  // reports every viewer's IP, User-Agent and Referer to whoever owns it.
  if (src.startsWith('http')) {
    if (imageError || !isAllowedImageUrl(src)) {
      return (
        <div
          className={`bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center ${className}`}
          style={{ width, height }}
          role="img"
          aria-label={alt}
        >
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      )
    }

    return (
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onError={() => setImageError(true)}
        style={{
          objectFit: 'cover',
          maxWidth: '100%',
          height: 'auto',
        }}
      />
    )
  }

  // For internal images, use Next.js Image component
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      loading={priority ? 'eager' : 'lazy'}
      placeholder={placeholder}
      blurDataURL={blurDataURL}
      onError={() => setImageError(true)}
      style={{
        objectFit: 'cover',
        maxWidth: '100%',
        height: 'auto',
      }}
    />
  )
}

