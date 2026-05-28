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

// Default order is the "real visitor scan" order:
//   identity (avatar / name / location)
//   → vibe (status pills — verified / work status / open-to-coffee)
//   → introduction (bio)
//   → conversion (hire then meetup, primary before secondary)
//   → proof (blurbs / featured work)
//   → history (stays)
//   → deep-dive (links / stats / map)
//
// The previous order buried hire_cta at position 12/13. A visitor had to
// scroll past bio, blurbs, work, stays, map, stats, and status before
// hitting the freelancer wedge's primary conversion button — effectively
// hidden. Status pills were similarly buried at position 10 even though
// they're the "vibe" signals a visitor reads earliest. Reordering here
// only affects users who haven't customized their section_order;
// reconcileSectionOrder preserves stored orders unchanged.
export const NOMAD_SECTIONS: SectionDef[] = [
  { id: 'avatar', label: 'Avatar', description: 'Profile picture or initial' },
  { id: 'name', label: 'Name & role', description: 'Display name and what you do', required: true },
  { id: 'location', label: 'Currently in', description: 'City + live local time' },
  // Verified + work status + Open-to-coffee chip — context signals a
  // visitor reads right after "who and where". Promoted from position 10
  // to right after location.
  { id: 'status', label: 'Status pills', description: 'Verified badge + work status' },
  { id: 'bio', label: 'Bio', description: 'One-line introduction' },
  // Solid-accent CTA button — the freelancer wedge's primary conversion
  // path. Promoted from position 12 to right after bio, where a scanning
  // visitor still encounters it without depth-scrolling.
  { id: 'hire', label: 'Hire CTA', description: 'Prominent "Hire me / Book a call" button' },
  // Secondary outlined CTA — paired with hire above. Sits directly after
  // hire so the pair reads as one conversion zone.
  { id: 'meetup', label: 'Meetup CTA', description: 'Secondary "Grab a coffee / Say hi" button' },
  { id: 'blurbs', label: 'Blurbs', description: 'Label/value pairs — Now reading, Booking, Rate, Tools…' },
  // Clickable project tiles — case studies / portfolio pieces. Renders
  // only when at least one entry exists; cap of 6 enforced at the API.
  { id: 'work', label: 'Featured work', description: 'Project tiles — case studies, portfolio pieces (up to 6)' },
  { id: 'stays', label: 'Stays', description: 'City-level travel with day counts' },
  { id: 'links', label: 'Links', description: 'External links' },
  { id: 'stats', label: 'Stats', description: 'Countries visited + member since' },
  { id: 'map', label: 'World map', description: 'Visited countries plotted as constellation' },
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
 *
 * Sections added to the catalog AFTER this row was saved are auto-included —
 * same intent as reconcileSectionOrder appending missing IDs. The /settings
 * page does not (currently) expose any "enable/disable" UI and the
 * /api/settings PUT schema does not accept enabled_sections, so a stored
 * array that lacks a recent ID is "didn't exist at save time", not "user
 * opted out". Without this, a stale enabled_sections column quietly hides
 * every feature we shipped after the row was first written (blurbs, work,
 * hire CTA, meetup CTA, stays for some legacy rows).
 *
 * When we eventually ship a disable-section UI, this behaviour will need to
 * be revisited — we'll want to distinguish "explicitly disabled" from
 * "didn't exist yet", probably via a separate disabled_sections column or a
 * schema version stamp.
 */
export function reconcileEnabledSections(
  _profileType: 'creator' | 'nomad' | 'both' | string | undefined,
  stored: string[] | null | undefined
): Set<string> {
  const allIds = NOMAD_SECTIONS.map((s) => s.id)
  const requiredIds = NOMAD_SECTIONS.filter((s) => s.required).map((s) => s.id)
  if (!stored || stored.length === 0) return new Set(allIds)
  const allowedSet = new Set(allIds)
  const cleaned = stored.filter((id) => allowedSet.has(id))
  if (cleaned.length === 0) return new Set(allIds)
  const missing = allIds.filter((id) => !cleaned.includes(id))
  const final = new Set([...cleaned, ...missing])
  for (const id of requiredIds) final.add(id)
  return final
}
