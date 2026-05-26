// Section catalog for the Nomad Card. Stored in `profile_settings.enabled_sections`
// and `profile_settings.section_order` as JSONB arrays of these IDs.
//
// Creator Profile section IDs lived here at one point; they were removed when the
// Creator Profile wedge was deprecated.

export interface SectionDef {
  id: string
  label: string
  description: string
  // Required sections cannot be toggled off (still renderable in any order).
  required?: boolean
}

export const NOMAD_SECTIONS: SectionDef[] = [
  { id: 'avatar', label: 'Avatar', description: 'Profile picture or initial' },
  { id: 'name', label: 'Name & role', description: 'Display name and what you do', required: true },
  { id: 'location', label: 'Currently in', description: 'City + live local time' },
  { id: 'bio', label: 'Bio', description: 'One-line introduction' },
  { id: 'blurbs', label: 'Blurbs', description: 'Label/value pairs — Now reading, Booking, Rate, Tools…' },
  // Clickable project tiles — case studies / portfolio pieces. Renders
  // only when at least one entry exists; cap of 6 enforced at the API.
  { id: 'work', label: 'Featured work', description: 'Project tiles — case studies, portfolio pieces (up to 6)' },
  { id: 'stays', label: 'Stays', description: 'City-level travel with day counts' },
  { id: 'stats', label: 'Stats', description: 'Countries visited + member since' },
  { id: 'map', label: 'World map', description: 'Visited countries plotted as constellation' },
  { id: 'status', label: 'Status pills', description: 'Verified badge + work status' },
  // Solid-accent CTA button. Renders only when both label and URL are set.
  { id: 'hire', label: 'Hire CTA', description: 'Prominent "Hire me / Book a call" button' },
  { id: 'links', label: 'Links', description: 'External links' },
]

export const NOMAD_DEFAULT_ORDER = NOMAD_SECTIONS.map((s) => s.id)

const NOMAD_IDS = new Set(NOMAD_DEFAULT_ORDER)

/**
 * Reconciles a stored section_order against the canonical Nomad set.
 * - Drops unknown IDs (legacy creator IDs, removed sections).
 * - Appends any new sections that have been added since the user last saved
 *   (so a new feature shows up by default rather than vanishing).
 * - Falls back to the default order when nothing usable is stored.
 *
 * Accepts the `profileType` param for forward compatibility but currently only
 * the nomad catalog exists.
 */
export function reconcileSectionOrder(
  _profileType: 'creator' | 'nomad' | 'both' | string | undefined,
  stored: string[] | null | undefined
): string[] {
  if (!stored || stored.length === 0) return NOMAD_DEFAULT_ORDER
  const cleaned = stored.filter((id) => NOMAD_IDS.has(id))
  if (cleaned.length === 0) return NOMAD_DEFAULT_ORDER
  const missing = NOMAD_DEFAULT_ORDER.filter((id) => !cleaned.includes(id))
  return [...cleaned, ...missing]
}

/**
 * Returns the enabled set, defaulting to "all enabled" when nothing is stored.
 * Always includes required sections regardless of the stored value.
 */
export function reconcileEnabledSections(
  _profileType: 'creator' | 'nomad' | 'both' | string | undefined,
  stored: string[] | null | undefined
): Set<string> {
  const allIds = NOMAD_SECTIONS.map((s) => s.id)
  const requiredIds = NOMAD_SECTIONS.filter((s) => s.required).map((s) => s.id)
  if (!stored) return new Set(allIds)
  const allowedSet = new Set(allIds)
  const cleaned = stored.filter((id) => allowedSet.has(id))
  const final = new Set(cleaned.length > 0 ? cleaned : allIds)
  for (const id of requiredIds) final.add(id)
  return final
}
