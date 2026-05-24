// Handles that must never be claimable as a user profile.
// Add to this list with intent: every entry is a permanent name lock.

const RESERVED = new Set<string>([
  // Top-level app routes — colliding with these breaks the page.
  'api',
  'auth',
  'create-card',
  'explore',
  'import',
  'in',
  'login',
  'logout',
  'map',
  'og',
  'preview',
  'settings',

  // Common file-like requests that the [handle] route would otherwise swallow.
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
  'manifest.json',
  'apple-touch-icon.png',
  '.well-known',

  // System / admin / brand — block early to prevent squatting.
  'admin', 'administrator', 'root', 'system', 'support', 'help', 'staff',
  'about', 'terms', 'privacy', 'legal', 'tos', 'security',
  'blog', 'docs', 'changelog', 'status', 'pricing',
  'home', 'index', 'dashboard', 'app', 'www', 'mail', 'email',
  'nomad', 'nomadnow', 'nomad-now', 'official',
  'me', 'you', 'user', 'profile', 'account',
])

export function isReservedHandle(handle: string | undefined | null): boolean {
  if (!handle) return false
  return RESERVED.has(handle.toLowerCase())
}
