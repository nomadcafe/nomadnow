import { logError, ValidationError } from './errors'

// Google Safe Browsing v4 "threatMatches:find" lookup.
//
// Gated on GOOGLE_SAFE_BROWSING_API_KEY: when the key is unset (local dev,
// preview deploys, CI) every check is a no-op that reports all URLs safe, so
// the product builds and runs without the key and only gains protection once
// it's configured in production.
//
// Posture is FAIL-OPEN. Any missing key, network error, timeout, quota
// rejection, or unexpected payload reports the checked URLs as *safe* rather
// than hiding them. A flaky Google endpoint must never blank out every card on
// the site. We trade "a malicious link might slip through during an outage"
// for "the product keeps working" — acceptable because the render-time scrub
// re-checks on the next request once the TTL lapses, and human reporting is
// the backstop for anything automated detection misses.

const API_KEY = process.env.GOOGLE_SAFE_BROWSING_API_KEY
const ENDPOINT = 'https://safebrowsing.googleapis.com/v4/threatMatches:find'

// Per-warm-instance verdict cache so we don't re-query Google for the same URL
// on every profile view. TTL is short enough that a link weaponised *after*
// it was first cached as clean gets re-checked within hours.
const TTL_MS = 6 * 60 * 60 * 1000 // 6h
const verdicts = new Map<string, { unsafe: boolean; expires: number }>()

// Safe Browsing only scans http/https. mailto:/tel: can't host a threat and
// are skipped (and always treated as safe).
function isScannable(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://')
}

/**
 * Returns the subset of `urls` that Google Safe Browsing flags as malware,
 * social engineering (phishing), or unwanted/harmful software. Deduplicates,
 * skips non-http(s) entries, and serves cached verdicts where possible so a
 * page with N links costs at most one batched API call per TTL window.
 *
 * Never throws — see the fail-open note above.
 */
export async function findUnsafeUrls(urls: string[]): Promise<Set<string>> {
  const unsafe = new Set<string>()
  if (!API_KEY) return unsafe

  const now = Date.now()
  const toQuery: string[] = []
  const seen = new Set<string>()

  for (const url of urls) {
    if (!url || seen.has(url) || !isScannable(url)) continue
    seen.add(url)
    const cached = verdicts.get(url)
    if (cached && cached.expires > now) {
      if (cached.unsafe) unsafe.add(url)
    } else {
      toQuery.push(url)
    }
  }

  if (toQuery.length === 0) return unsafe

  try {
    // Cap the wait so a slow Safe Browsing response can't stall page render.
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)

    let flagged: Set<string>
    try {
      const res = await fetch(`${ENDPOINT}?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        // Defence-in-depth caching is ours (the Map above); don't let Next's
        // fetch cache memoise a verdict indefinitely.
        cache: 'no-store',
        body: JSON.stringify({
          client: { clientId: 'nomadnow', clientVersion: '1.0' },
          threatInfo: {
            threatTypes: [
              'MALWARE',
              'SOCIAL_ENGINEERING',
              'UNWANTED_SOFTWARE',
              'POTENTIALLY_HARMFUL_APPLICATION',
            ],
            platformTypes: ['ANY_PLATFORM'],
            threatEntryTypes: ['URL'],
            threatEntries: toQuery.map((url) => ({ url })),
          },
        }),
      })

      if (!res.ok) {
        // Quota / auth / 5xx — log once and fail open for this batch.
        logError(new Error(`Safe Browsing HTTP ${res.status}`), {
          operation: 'safe_browsing_lookup',
          count: toQuery.length,
        })
        return unsafe
      }

      const data = (await res.json()) as {
        matches?: Array<{ threat?: { url?: string } }>
      }
      // The API echoes back the exact submitted string for each match, so we
      // can map verdicts by string equality. Absent `matches` => all clean.
      flagged = new Set(
        (data.matches ?? [])
          .map((m) => m.threat?.url)
          .filter((u): u is string => typeof u === 'string'),
      )
    } finally {
      clearTimeout(timeout)
    }

    const expires = now + TTL_MS
    for (const url of toQuery) {
      const isUnsafe = flagged.has(url)
      verdicts.set(url, { unsafe: isUnsafe, expires })
      if (isUnsafe) unsafe.add(url)
    }
  } catch (error) {
    // AbortError (timeout) or any network failure: fail open, don't cache.
    logError(error, { operation: 'safe_browsing_lookup', count: toQuery.length })
  }

  return unsafe
}

/**
 * Save-time gate for the link-writing API routes: throws a ValidationError
 * naming the first flagged URL if any of `urls` is known-malicious, so the
 * caller gets a 400 with an actionable message instead of silently publishing
 * a bad link (which the render-time scrub would then hide anyway). Fails open
 * — when the key is unset or Google is unreachable, findUnsafeUrls returns an
 * empty set and the save proceeds.
 */
export async function assertUrlsSafe(urls: string[]): Promise<void> {
  const unsafe = await findUnsafeUrls(urls)
  if (unsafe.size > 0) {
    const [first] = unsafe
    throw new ValidationError(
      `This link was flagged as unsafe and can't be saved: ${first}`,
      { unsafeUrls: [...unsafe] },
    )
  }
}
