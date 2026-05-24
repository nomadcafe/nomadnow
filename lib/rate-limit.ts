import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Rate limiting via Upstash Redis.
//
// Why Upstash (vs in-memory): Vercel / serverless runs many warm instances,
// each with its own memory. An in-memory store rate-limits per-instance,
// which effectively means "no rate limit" once you have 5+ replicas.
// Upstash gives a single counter that all instances share, atomic via Lua.
//
// Why fail-open: if Redis hiccups, we'd rather let real users through than
// 503 the API. Burst protection is "good to have"; availability is "must have".

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number // ms epoch
  limit: number
}

const WINDOW_MS = 15 * 60 * 1000
const MAX_REQUESTS = 100
const FALLBACK_OK: () => RateLimitResult = () => ({
  allowed: true,
  remaining: MAX_REQUESTS,
  resetAt: Date.now() + WINDOW_MS,
  limit: MAX_REQUESTS,
})

let limiter: Ratelimit | null = null
let initTried = false

function getLimiter(): Ratelimit | null {
  if (initTried) return limiter
  initTried = true

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

  const redis = new Redis({ url, token })
  limiter = new Ratelimit({
    redis,
    // Sliding window: 100 requests per 15 minutes per identifier.
    // Smoother than fixed window — avoids the "every quarter hour, burst" pattern.
    limiter: Ratelimit.slidingWindow(MAX_REQUESTS, '15 m'),
    analytics: false,
    prefix: 'rl:api',
  })
  return limiter
}

/**
 * Check if the request from `identifier` (typically `api:<ip>`) is allowed.
 * Returns immediately as `allowed: true` when Upstash isn't configured
 * (local dev) or unreachable (transient failure).
 */
export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  const lim = getLimiter()
  if (!lim) return FALLBACK_OK()

  try {
    const { success, remaining, reset, limit } = await lim.limit(identifier)
    return { allowed: success, remaining, resetAt: reset, limit }
  } catch {
    // Transient Redis / network failure. Don't block real users.
    return FALLBACK_OK()
  }
}

// Exposed so callers can branch their UX (e.g. surface a "rate limit unavailable"
// indicator in dev), and so tests can assert on configuration.
export function isRateLimitConfigured(): boolean {
  return getLimiter() !== null
}
