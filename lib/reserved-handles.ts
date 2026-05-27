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
])

export function isReservedHandle(handle: string | undefined | null): boolean {
  if (!handle) return false
  return RESERVED.has(handle.toLowerCase())
}
