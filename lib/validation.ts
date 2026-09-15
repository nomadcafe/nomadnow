import { z } from 'zod'
import { isAllowedImageUrl } from './image-hosts'

// Handle validation — must match the UI rules in app/create-card/page.tsx
// (2-50 chars, letters/numbers/_/- only). Single-character handles are reserved
// for potential future premium / brand use.
export const handleSchema = z
  .string()
  .min(2, 'Handle must be at least 2 characters')
  .max(50, 'Handle is too long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Handle can only contain letters, numbers, underscores, and hyphens')

// URL validation for user-supplied links that get rendered as `<a href={url}>`.
// Zod's built-in .url() accepts ANY URL the WHATWG parser likes — including
// `javascript:alert(...)` — which becomes an XSS payload the moment any
// visitor clicks the link. Restrict to a scheme allow-list so a malicious
// user can't publish a link that runs code on someone else's machine.
const ALLOWED_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:'])
export const safeLinkUrlSchema = z
  .string()
  .url('Invalid URL')
  .max(2048, 'URL is too long')
  .refine((value) => {
    try {
      const parsed = new URL(value)
      return ALLOWED_LINK_PROTOCOLS.has(parsed.protocol)
    } catch {
      return false
    }
  }, 'URL must use http, https, mailto, or tel')

// Avatar URLs are rendered as an <img src> on the public card and in the
// /explore directory, so unlike a link (which only fires on a click) they make
// every visitor's browser reach the host on page load. Restrict them to the
// hosts we actually serve images from — see lib/image-hosts for why the
// next.config optimizer allow-list can't do this job. Rejecting at the write
// boundary keeps the DB clean; OptimizedImage re-checks at render as a
// backstop for rows written before this existed.
export const avatarUrlSchema = z
  .string()
  .url('Invalid URL')
  .max(2048, 'URL is too long')
  .refine(isAllowedImageUrl, 'Avatar must be an uploaded image')
