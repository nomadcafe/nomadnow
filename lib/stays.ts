// Day count + duration formatting for nomad_stays. Pure functions so they
// work both server-side (for the rendered card) and client-side (for the
// live preview while editing).

const MS_PER_DAY = 86_400_000

/**
 * Days from start to end (inclusive of the day itself). Both arguments are
 * YYYY-MM-DD ISO date strings. If `end` is null/undefined, counts up to
 * today — that's the "currently here" case.
 */
export function stayDayCount(start: string, end?: string | null): number {
  const startTs = Date.parse(start)
  if (Number.isNaN(startTs)) return 0
  const endTs = end ? Date.parse(end) : Date.now()
  if (Number.isNaN(endTs) || endTs < startTs) return 0
  // +1 so a same-day stay reads as 1 day, not 0.
  return Math.floor((endTs - startTs) / MS_PER_DAY) + 1
}

/**
 * Adaptive label: short stays render in days, multi-week in weeks, very
 * long in months. Keeps the card text concise while still feeling honest
 * for both "just landed" (4 days) and "based here" (8 months).
 */
export function formatDuration(days: number): { value: number; unit: 'day' | 'week' | 'month' } {
  if (days < 1) return { value: 0, unit: 'day' }
  if (days < 21) return { value: days, unit: 'day' }
  if (days < 90) return { value: Math.round(days / 7), unit: 'week' }
  return { value: Math.round(days / 30), unit: 'month' }
}

/**
 * Returns the user's current stay (the open-ended one — end_date null —
 * or the most-recent-start stay if multiple are open). Used by the card
 * to render "Currently in X" prominently.
 */
export function findCurrentStay<
  T extends { end_date?: string | null; start_date: string },
>(stays: T[]): T | null {
  if (!stays || stays.length === 0) return null
  const open = stays.filter((s) => !s.end_date)
  if (open.length === 0) return null
  // Multiple open stays is a data anomaly (user forgot to set end_date when
  // they moved) — pick the latest start so the card stays meaningful.
  return open.reduce((latest, s) =>
    Date.parse(s.start_date) > Date.parse(latest.start_date) ? s : latest,
  )
}
