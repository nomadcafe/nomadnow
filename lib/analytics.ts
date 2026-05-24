/**
 * Analytics and tracking utilities
 */

/**
 * Track page view
 */
export function trackPageView(path: string, title?: string) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    ;(window as any).gtag('config', 'GA_MEASUREMENT_ID', {
      page_path: path,
      page_title: title,
    })
  }

  // Console log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Page view:', { path, title })
  }
}

/**
 * Track event
 */
export function trackEvent(
  action: string,
  category: string,
  label?: string,
  value?: number
) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    ;(window as any).gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    })
  }

  // Console log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Event:', { action, category, label, value })
  }
}

/**
 * Track API call
 */
export function trackAPICall(endpoint: string, method: string, status: number) {
  trackEvent('api_call', 'api', `${method} ${endpoint}`, status)
}

/**
 * Track error
 */
export function trackError(error: Error, context?: Record<string, unknown>) {
  trackEvent('error', 'error', error.message)

  // Console error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Tracked error:', error, context)
  }
}





