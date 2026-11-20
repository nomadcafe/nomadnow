// Shared bits for /privacy and /terms.

// Both pages render `<email>` chunks from the i18n strings as mailto links.
// The address lives here so the href can never drift from the visible text
// (and so changing it is one edit, not four).
export const CONTACT_EMAIL = 'hello@nomad.now'
export const ABUSE_EMAIL = 'abuse@nomad.now'

export interface LegalSection {
  h: string
  p: string
}

// next-intl's raw() returns whatever the message file holds, with no schema
// behind it — a locale missing `sections` (or shipping it as a string) would
// otherwise take the whole page down with "sections.map is not a function".
// Falling back to an empty list degrades to intro + contact instead.
export function toLegalSections(raw: unknown): LegalSection[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (item): item is LegalSection =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as LegalSection).h === 'string' &&
      typeof (item as LegalSection).p === 'string',
  )
}
