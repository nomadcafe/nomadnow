// Handles that must never be claimable as a user profile.
// Add to this list with intent: every entry is a permanent name lock.

const RESERVED = new Set<string>([
  // Top-level app routes — colliding with these breaks the page.
  'api',
  'auth',
  'create-card',
  'edit',
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
  'admin', 'administrator', 'root', 'system', 'support', 'help', 'staff', 'webmaster',
  'about', 'terms', 'privacy', 'legal', 'tos', 'security',
  'blog', 'docs', 'changelog', 'status', 'pricing',
  'home', 'index', 'dashboard', 'app', 'www', 'mail', 'email',
  'nomad', 'nomadnow', 'nomad-now', 'official',
  'me', 'you', 'user', 'profile', 'account',

  // Well-known trademarks — defensive blocks to keep someone from claiming
  // a card at e.g. nomad.now/apple. Not exhaustive; add when concrete risk
  // surfaces. Generic-but-brand-adjacent terms (coffee, cafe) included
  // because they're high-collision in our remote-work / venue context.
  'apple', 'monster', 'tesla',
  'coffee', 'cafe',
  'google', 'facebook', 'meta', 'twitter', 'microsoft', 'amazon', 'netflix',
  'github', 'openai', 'anthropic', 'claude',
  'stripe', 'airbnb', 'uber', 'youtube', 'instagram', 'tiktok', 'linkedin',
  'spotify', 'discord', 'slack', 'notion', 'figma',

  // Abuse-prone generic terms — spammy / scammy / NSFW handles tend to
  // squat these to look authoritative. Block defensively.
  'money', 'cash', 'gold', 'chain', 'finance', 'financial', 'pay',
  'game', 'casino', 'sex',
  'link', 'domain',
  // AI-era brand-magnets — both generic categories and OpenAI's `gpt` mark.
  'ai', 'gpt', 'chat',

  // Locale / region codes — i18n is cookie-based today (no /en/foo routing),
  // but users typing `/en` expect a language switch, not a stranger's card.
  // Future-proofs against a switch to URL-based locales.
  'en', 'ja', 'zh', 'cn', 'jp', 'us', 'uk', 'tw', 'hk',

  // Auth synonyms — login/logout are already blocked above; add the common
  // variants people try.
  'signup', 'signin', 'signout', 'register', 'oauth', 'sso',

  // Generic action verbs — collide with hypothetical CRUD routes and read
  // ambiguously in URLs.
  'new', 'create', 'delete', 'update', 'search',

  // Asset / CDN / upload conventions — names hosting platforms reserve and
  // users assume are system paths.
  'cdn', 'static', 'assets', 'public', 'media', 'files', 'upload',

  // Feed / community conventions.
  'feed', 'news', 'tag', 'tags', 'category', 'community', 'forum',

  // Platform / framework names — defensive against impersonation and
  // confusion with Next.js / Vercel internals.
  'vercel', 'next',

  // Null-poisoning / error-string lookalikes — blocking these prevents
  // handles that read as bugs in logs or string-interpolated URLs.
  'null', 'undefined', 'true', 'false', 'none', 'nil', 'error', 'notfound', '404',
])

export function isReservedHandle(handle: string | undefined | null): boolean {
  if (!handle) return false
  return RESERVED.has(handle.toLowerCase())
}
