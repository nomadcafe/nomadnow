import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { z } from 'zod'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getEnvSafe } from '@/lib/env'
import { checkRateLimit } from '@/lib/rate-limit'
import { ValidationError, formatErrorResponse, logError } from '@/lib/errors'

// First-party analytics ingestion for public cards. Anonymous by design — the
// people viewing/clicking a card are strangers, never signed in — so it takes
// no auth and is bounded by an IP rate-limit instead. Rows are written with the
// service-role client because card_views / card_clicks are RLS-locked with no
// anon policy (migration 0033): visitors emit events here but can never read
// them back. Aggregates are served to owners by GET /api/stats.
//
// The client sends these via navigator.sendBeacon (so a click still records
// even as the browser navigates away), which posts the body as a JSON blob.

const eventSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('view'),
    handle: z.string().min(1).max(50),
  }),
  z.object({
    kind: z.literal('click'),
    handle: z.string().min(1).max(50),
    targetType: z.enum(['link', 'hire_cta', 'meetup_cta', 'featured_work']),
    // The owner's own destination URL. Optional/nullable — a malformed beacon
    // shouldn't drop the click entirely; we still want the count.
    targetUrl: z.string().max(2048).optional().nullable(),
  }),
])

function clientIp(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

// Coarse, privacy-preserving visitor identity: sha256 of ip + user-agent +
// today's UTC date + a server-only secret (the service-role key, which never
// leaves the server). Rotates daily so it can approximate "unique visitors
// today" without being a stable cross-day tracker, and is one-way so a leaked
// row can't be re-identified to an IP. Null when the secret isn't configured.
function visitorHash(ip: string, ua: string): string | null {
  const secret = getEnvSafe().SUPABASE_SERVICE_ROLE_KEY
  if (!secret) return null
  const day = new Date().toISOString().slice(0, 10)
  return createHash('sha256').update(`${ip}|${ua}|${day}|${secret}`).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request)

    // Keyed separately from content mutations so a busy card's event stream
    // doesn't eat into (or get starved by) the user's own edit budget.
    const limit = await checkRateLimit(`events:${ip}`)
    if (!limit.allowed) {
      // Analytics are best-effort; a rate-limited beacon is a silent no-op,
      // not a user-visible error.
      return NextResponse.json({ ok: true })
    }

    // sendBeacon posts a Blob; read as text then parse so we accept both
    // application/json and text/plain content types.
    const raw = await request.text()
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new ValidationError('Malformed event body')
    }
    const validation = eventSchema.safeParse(parsed)
    if (!validation.success) {
      throw new ValidationError('Invalid event', validation.error.errors)
    }
    const event = validation.data

    const admin = createAdminSupabase()

    // Resolve the handle to its owner. A non-resolving handle (renamed,
    // deleted, or bogus) is silently accepted-and-dropped so a scraper can't
    // probe handle existence through this endpoint.
    const { data: owner } = await admin
      .from('users')
      .select('id')
      .eq('handle', event.handle.toLowerCase())
      .maybeSingle()
    if (!owner) return NextResponse.json({ ok: true })

    const hash = visitorHash(ip, request.headers.get('user-agent') || '')

    if (event.kind === 'view') {
      // Referrer is trimmed to the DB cap; only kept for a coarse "where views
      // come from" and never surfaced with any visitor identity.
      const referrer = request.headers.get('referer')?.slice(0, 500) || null
      const { error } = await admin.from('card_views').insert({
        user_id: owner.id,
        handle: event.handle.toLowerCase(),
        visitor_hash: hash,
        referrer,
      })
      if (error) throw error
    } else {
      const { error } = await admin.from('card_clicks').insert({
        user_id: owner.id,
        handle: event.handle.toLowerCase(),
        target_type: event.targetType,
        target_url: event.targetUrl?.slice(0, 2048) || null,
        visitor_hash: hash,
      })
      if (error) throw error
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    logError(error, { operation: 'card_event' })
    const errorResponse = formatErrorResponse(error)
    return NextResponse.json(
      { error: errorResponse.error, code: errorResponse.code },
      { status: errorResponse.statusCode },
    )
  }
}
