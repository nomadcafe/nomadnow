// Canonical origin for absolute URLs in metadata, sitemaps and share images.
//
// Order matters: an explicit NEXT_PUBLIC_BASE_URL wins so a custom domain is
// never overridden, VERCEL_URL covers preview deployments, and the production
// domain is the last-resort default (a sitemap with localhost URLs in it is
// worse than one that's slightly optimistic about where it's hosted).
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_BASE_URL
  if (explicit) return explicit.replace(/\/$/, '')
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'https://nomad.now'
}
