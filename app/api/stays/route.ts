import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabase, requireUser } from '@/lib/supabase/server'
import { ValidationError, formatErrorResponse, logError } from '@/lib/errors'
import { bumpProfileCacheByUserId } from '@/lib/revalidate'

// Replace-all semantics (same approach as PUT /api/nomad-links): the form
// always submits the full desired stays list, server wipes existing and
// inserts new. Simpler than per-row CRUD for the editing flow and naturally
// handles reordering / removal.
const replaceStaysSchema = z.object({
  stays: z
    .array(
      z.object({
        city: z.string().min(1).max(100),
        country: z.string().length(2), // ISO 3166-1 alpha-2
        lat: z.number().min(-90).max(90).optional().nullable(),
        lon: z.number().min(-180).max(180).optional().nullable(),
        start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
        // Empty string from form inputs is allowed and treated as null
        // (= currently here).
        end_date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
          .optional()
          .nullable()
          .or(z.literal('')),
        notes: z.string().max(280).optional().nullable(),
        // Up to 6 Supabase Storage URLs. Content checks (MIME, size,
        // path) already ran at upload time; we just shape-validate the
        // structural URL here. Cap matches the editor UI cap.
        // https-only: our Storage URLs are always https, so this is a free
        // tightening that blocks http:/javascript:/data: from ever being
        // stored and later loaded as an <img src>. Mirrors the protocol
        // allow-list policy on links (safeLinkUrlSchema).
        photo_urls: z
          .array(
            z
              .string()
              .url()
              .max(2048)
              .refine((value) => {
                try {
                  const u = new URL(value)
                  // https + Supabase Storage host only. Stay photos are
                  // uploaded through /api/stays/photo/upload (Supabase Storage),
                  // so a non-Supabase URL is either a mistake or an attempt to
                  // make the image optimizer fetch an arbitrary/internal host
                  // (SSRF). The optimizer host allow-list (next.config) is the
                  // primary control; this rejects it at the source too.
                  return u.protocol === 'https:' && u.hostname.endsWith('.supabase.co')
                } catch {
                  return false
                }
              }, 'Photo URL must be an https Supabase Storage URL'),
          )
          .max(6)
          .optional()
          .nullable(),
      }),
    )
    .max(100),
})

export async function PUT(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser()
    const body = await request.json()
    const validation = replaceStaysSchema.safeParse(body)

    if (!validation.success) {
      throw new ValidationError('Invalid stays data', validation.error.errors)
    }

    // Wipe first; if we crash between delete and insert the user loses some
    // history but doesn't end up with duplicates. They can resubmit from the
    // form's draft.
    const { error: deleteError } = await supabase
      .from('nomad_stays')
      .delete()
      .eq('user_id', user.id)

    if (deleteError) {
      logError(deleteError, { operation: 'replace_stays_delete', userId: user.id })
      throw deleteError
    }

    if (validation.data.stays.length === 0) {
      await bumpProfileCacheByUserId(supabase, user.id)
      return NextResponse.json({ success: true, stays: [] })
    }

    const rows = validation.data.stays.map((stay) => ({
      user_id: user.id,
      city: stay.city,
      country: stay.country.toUpperCase(),
      lat: stay.lat ?? null,
      lon: stay.lon ?? null,
      start_date: stay.start_date,
      // Empty string → null. Important because Postgres rejects '' as a DATE.
      end_date: stay.end_date && stay.end_date.length > 0 ? stay.end_date : null,
      notes: stay.notes || null,
      photo_urls: stay.photo_urls ?? [],
    }))

    const { data, error } = await supabase
      .from('nomad_stays')
      .insert(rows)
      .select()

    if (error) {
      logError(error, { operation: 'replace_stays_insert', userId: user.id })
      throw error
    }

    await bumpProfileCacheByUserId(supabase, user.id)
    return NextResponse.json({ success: true, stays: data || [] })
  } catch (error) {
    logError(error, { operation: 'replace_stays' })
    const r = formatErrorResponse(error)
    return NextResponse.json(
      { error: r.error, code: r.code, details: r.details },
      { status: r.statusCode },
    )
  }
}
