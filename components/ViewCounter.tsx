'use client'

import React, { useEffect, useState } from 'react'

interface ViewCounterProps {
  handle: string
  className?: string
}

export function ViewCounter({ handle, className = '' }: ViewCounterProps) {
  const [views, setViews] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Track page view
    const trackView = async () => {
      try {
        // In a real app, you would send this to your analytics API
        // For now, we'll use localStorage as a simple counter
        const key = `profile_views_${handle}`
        const storedViews = localStorage.getItem(key)
        const newViews = storedViews ? parseInt(storedViews, 10) + 1 : 1
        localStorage.setItem(key, newViews.toString())
        setViews(newViews)
      } catch (error) {
        console.error('Error tracking view:', error)
      } finally {
        setLoading(false)
      }
    }

    // Only track once per session
    const sessionKey = `viewed_${handle}_${Date.now()}`
    const viewed = sessionStorage.getItem(sessionKey)
    
    if (!viewed) {
      trackView()
      sessionStorage.setItem(sessionKey, 'true')
    } else {
      setLoading(false)
    }
  }, [handle])

  // Don't show if views are not available or loading
  if (loading || views === null) {
    return null
  }

  return (
    <div className={`flex items-center gap-2 text-xs text-gray-500 ${className}`}>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
      <span>{views.toLocaleString()} views</span>
    </div>
  )
}





