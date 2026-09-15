// Allow-list of hosts we will load a remote image from.
//
// Why this exists as app code rather than only as next.config's
// `images.remotePatterns`: that setting governs the Next image OPTIMIZER, and
// OptimizedImage only reaches the optimizer for relative paths — every
// absolute URL takes its raw <img> branch. Since every legitimate image we
// store is an absolute https URL (Supabase Storage, Google avatars), the
// optimizer allow-list never actually sees them, so it can't be the control it
// looks like. This is.
//
// The two entries mirror remotePatterns exactly:
//   *.supabase.co         — our Storage bucket; every avatar / background /
//                           stay photo uploaded through the app lands here
//   *.googleusercontent.com — profile pictures from Google OAuth, the only
//                           OAuth provider wired up (app/login)
//
// Enforced in two places, deliberately: at the write boundary (the Zod schema
// on avatar_url / photo_urls, so junk never reaches the DB) and at render
// (OptimizedImage, so a row that predates the schema or was written through
// some other path still can't make a visitor's browser hit a third-party
// server). An arbitrary avatar host is a tracking pixel on a public card —
// it hands the card's owner the IP, User-Agent and Referer of every visitor,
// which is exactly what the analytics design (migration 0033) refuses to
// collect for them.
const ALLOWED_IMAGE_HOST_SUFFIXES = ['.supabase.co', '.googleusercontent.com'] as const

// The project's own Storage host, read from the public env var rather than
// assumed. `*.supabase.co` covers hosted Supabase, but a project on a custom
// Storage domain would otherwise have every one of its images blocked — a
// silent, site-wide breakage that's much worse than the hole this closes.
function storageHost(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!raw) return null
  try {
    return new URL(raw).hostname
  } catch {
    return null
  }
}

/**
 * True when `raw` is an https URL on a host we're willing to load an image
 * from. Leading-dot suffixes, so `evilsupabase.co` fails and only real
 * subdomains of the allowed apexes pass.
 */
export function isAllowedImageUrl(raw: string | null | undefined): boolean {
  if (!raw) return false
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return false
  }
  if (url.protocol !== 'https:') return false
  if (url.hostname === storageHost()) return true
  return ALLOWED_IMAGE_HOST_SUFFIXES.some((suffix) => url.hostname.endsWith(suffix))
}
