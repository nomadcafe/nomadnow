'use client'

import { useEffect } from 'react'

/**
 * Performance monitoring component
 * Logs performance metrics to console in development
 */
export function PerformanceMonitor() {
  useEffect(() => {
    if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') {
      return
    }

    // Measure page load performance
    if (typeof window.performance !== 'undefined') {
      window.addEventListener('load', () => {
        const perfData = window.performance.timing
        const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart
        const domContentLoaded = perfData.domContentLoadedEventEnd - perfData.navigationStart
        const domInteractive = perfData.domInteractive - perfData.navigationStart

        console.log('📊 Performance Metrics:', {
          'Page Load Time': `${pageLoadTime}ms`,
          'DOM Content Loaded': `${domContentLoaded}ms`,
          'DOM Interactive': `${domInteractive}ms`,
        })

        // Log Core Web Vitals if available
        if ('web-vital' in window) {
          // This would require @web-vitals library
          console.log('✅ Core Web Vitals available')
        }
      })
    }

    // Monitor long tasks (if supported)
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              console.warn('⚠️ Long task detected:', {
                duration: `${entry.duration.toFixed(2)}ms`,
                startTime: `${entry.startTime.toFixed(2)}ms`,
              })
            }
          }
        })

        observer.observe({ entryTypes: ['longtask'] })
      } catch (e) {
        // Long task observer not supported
      }
    }
  }, [])

  return null
}




