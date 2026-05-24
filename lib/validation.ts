import { z } from 'zod'

// Handle validation — must match the UI rules in app/create-card/page.tsx
// (2-50 chars, letters/numbers/_/- only). Single-character handles are reserved
// for potential future premium / brand use.
export const handleSchema = z
  .string()
  .min(2, 'Handle must be at least 2 characters')
  .max(50, 'Handle is too long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Handle can only contain letters, numbers, underscores, and hyphens')
