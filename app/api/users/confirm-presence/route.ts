import { NextResponse } from 'next/server'
import { requireActivePlan } from '@/lib/billing-guard'
import { formatErrorResponse, logError } from '@/lib/errors'
import { bumpProfileCache } from '@/lib/revalidate'

// The one-tap "I'm still here" refresh — the cheapest possible way for a nomad
// to keep the "now" layer honest. No body: the only thing it does is stamp
// presence_confirmed_at = now() on the caller's own row, which re-freshens the
// card's location / open-to-coffee signals and clears the staleness fade (see
// lib/presence.ts + the location renderer). Deliberately separate from the big
// PUT /api/users so confirming presence never has to round-trip the whole
// profile form, and so the value is unambiguously server-set.
export async function POST() {
  try {
    const { supabase, user } = await requireActivePlan()
    const now = new Date().toISOString()

    // updated_at intentionally left untouched — confirming you're still in town
    // isn't a content edit, and keeping the two timestamps independent is the
    // entire point of the column (migration 0028).
    const { data, error } = await supabase
      .from('users')
      .update({ presence_confirmed_at: now })
      .eq('id', user.id)
      .select('handle,presence_confirmed_at')
      .single()

    if (error) {
      logError(error, { operation: 'confirm_presence', userId: user.id })
      throw error
    }
    if (!data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Bust the profile card cache so the refreshed freshness shows immediately.
    // Explore cache is intentionally NOT bumped — the directory doesn't rank on
    // presence yet (P2), so bumping it here would be pointless cache churn.
    if (data.handle) bumpProfileCache(data.handle as string)

    return NextResponse.json({
      success: true,
      presence_confirmed_at: data.presence_confirmed_at,
    })
  } catch (error) {
    logError(error, { operation: 'confirm_presence' })
    const errorResponse = formatErrorResponse(error)
    return NextResponse.json(
      { error: errorResponse.error, code: errorResponse.code, details: errorResponse.details },
      { status: errorResponse.statusCode },
    )
  }
}
