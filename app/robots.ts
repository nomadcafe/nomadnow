import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/seo/site-url'

// Crawl rules for the whole site. Everything public is fair game except the
// authenticated shell and the API surface — those pages either redirect to
// /login or return JSON, so indexing them only produces soft-404s.
//
// Individual free cards carry their own `noindex` from generateMetadata (see
// app/[handle]/page.tsx) rather than being blocked here: a Disallow would stop
// the crawler from ever reading that meta tag, and a previously-indexed card
// that upgrades needs the crawler to come back.
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl()
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/edit/', '/create-card', '/settings', '/admin', '/login', '/auth/', '/preview'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
