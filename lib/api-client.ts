/**
 * API client utilities
 */

import { logger } from './logger'

export class APIError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'APIError'
  }
}

/**
 * Enhanced fetch with logging and error handling
 */
export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const startTime = Date.now()
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    const duration = Date.now() - startTime
    logger.logAPI(url, options?.method || 'GET', response.status, duration)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: response.statusText,
      }))

      throw new APIError(
        errorData.error || 'Request failed',
        errorData.code,
        errorData.details
      )
    }

    return await response.json()
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error(`API call failed: ${url}`, { error, duration })

    if (error instanceof APIError) {
      throw error
    }

    throw new APIError(
      error instanceof Error ? error.message : 'Network error',
      'NETWORK_ERROR'
    )
  }
}

/**
 * GET request helper
 */
export function apiGet<T>(url: string): Promise<T> {
  return apiFetch<T>(url, { method: 'GET' })
}

/**
 * POST request helper
 */
export function apiPost<T>(url: string, data?: unknown): Promise<T> {
  return apiFetch<T>(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * PUT request helper
 */
export function apiPut<T>(url: string, data?: unknown): Promise<T> {
  return apiFetch<T>(url, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * DELETE request helper
 */
export function apiDelete<T>(url: string): Promise<T> {
  return apiFetch<T>(url, { method: 'DELETE' })
}

