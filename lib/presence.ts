// The "now" layer's brain. Turns a presence_confirmed_at timestamp into the
// two things the card needs: how long ago presence was asserted, and whether
// that assertion has gone stale. Kept framework-free (no React, no next-intl)
// so it's callable from the server card renderer, the explore ranking, and
// tests alike.

// A presence claim is considered stale after this many days. Tuned to the nomad
// rhythm: most people stay somewhere 2–8 weeks, so ~3 weeks is the point where
// "still in Bangkok?" stops being a safe assumption. Past this the card fades
// the current_city / open-to-coffee signals and nudges the owner to re-confirm.
export const STALE_AFTER_DAYS = 21

const MS_PER_DAY = 24 * 60 * 60 * 1000

export interface PresenceFreshness {
  // Whole days since the presence was confirmed (0 = today). Clamped at 0 so a
  // forged future timestamp can never render as a negative "in 3 days".
  daysAgo: number
  // True once daysAgo exceeds STALE_AFTER_DAYS — the card should de-emphasise
  // the live presence signals and prompt the owner.
  stale: boolean
}

// Returns null when there's no timestamp to reason about (legacy rows, or a
// card that never set a city) so callers can cleanly skip the whole freshness
// affordance rather than rendering "confirmed NaN days ago".
export function presenceFreshness(
  confirmedAt: string | null | undefined,
  nowMs: number,
): PresenceFreshness | null {
  if (!confirmedAt) return null
  const confirmedMs = Date.parse(confirmedAt)
  if (Number.isNaN(confirmedMs)) return null
  // Future timestamps (clock skew or a forged value — see migration 0028) are
  // treated as "just confirmed" rather than negative days.
  const daysAgo = Math.max(0, Math.floor((nowMs - confirmedMs) / MS_PER_DAY))
  return { daysAgo, stale: daysAgo > STALE_AFTER_DAYS }
}

// Localised "confirmed 3 days ago" / "今天" relative string. Uses
// Intl.RelativeTimeFormat with numeric:'auto' so 0/1 days read as
// today/yesterday in every locale without per-locale message keys. Picks a
// coarser unit as the gap widens so we never render "confirmed 200 days ago".
export function formatPresenceAgo(daysAgo: number, locale: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  if (daysAgo < 30) return rtf.format(-daysAgo, 'day')
  if (daysAgo < 365) return rtf.format(-Math.round(daysAgo / 30), 'month')
  return rtf.format(-Math.round(daysAgo / 365), 'year')
}
