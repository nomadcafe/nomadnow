import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabase, requireUser } from '@/lib/supabase/server'
import { ValidationError, formatErrorResponse, logError } from '@/lib/errors'
import { bumpProfileCacheByUserId } from '@/lib/revalidate'
import { assertUrlsSafe } from '@/lib/safe-browsing'

// Replace-all semantics — same shape as /api/blurbs and /api/nomad-links.
// The form always submits the full desired set; server wipes and re-inserts.
// Cap at 6 to keep the "Featured Work" section legible (matches GitHub
// Pinned — enough to make a case, not so many that the section drowns
// the card).
//
// URL is restricted to http/https here — featured works are project pages
// / case studies, not contact methods. mailto/tel belong on the Hire CTA.
const FEATURED_URL_PROTOCOLS = new Set(['http:', 'https:'])
const featuredUrlSchema = z
  .string()
  .url('Invalid URL')
  .max(2048, 'URL is too long')
  .refine((value) => {
    try {
      const parsed = new URL(value)
      return FEATURED_URL_PROTOCOLS.has(parsed.protocol)
    } catch {
      return false
    }
  }, 'URL must use http or https')

const replaceFeaturedWorksSchema = z.object({
  featured_works: z
    .array(
      z.object({
        title: z.string().min(1).max(80),
        url: featuredUrlSchema,
        // Empty string from the form means "no description" — coerce to null
        // before insert so the DB CHECK (which permits NULL) is happy.
        description: z.string().max(140).optional().nullable(),
      }),
    )
    .max(6),
})

export async function PUT(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser()
    const body = await request.json()
    const validation = replaceFeaturedWorksSchema.safeParse(body)
    if (!validation.success) {
      throw new ValidationError('Invalid featured work data', validation.error.errors)
    }

    // Reject known-malicious links before storing (fail-open; render-time
    // scrub is the backstop). See app/api/nomad-links/route.ts.
    await assertUrlsSafe(validation.data.featured_works.map((w) => w.url))

    // Wipe-then-insert — same as nomad_blurbs replace-all. If we crash
    // between the two, the user sees no featured works and can resubmit;
    // less bad than ending up with a duplicate / partial set.
    const { error: deleteError } = await supabase
      .from('nomad_featured_works')
      .delete()
      .eq('user_id', user.id)
    if (deleteError) {
      logError(deleteError, { operation: 'replace_featured_works_delete', userId: user.id })
      throw deleteError
    }

    if (validation.data.featured_works.length === 0) {
      await bumpProfileCacheByUserId(supabase, user.id)
      return NextResponse.json({ success: true, featured_works: [] })
    }

    const rows = validation.data.featured_works.map((work, index) => {
      const desc = work.description?.trim()
      return {
        user_id: user.id,
        title: work.title.trim(),
        url: work.url.trim(),
        description: desc ? desc : null,
        order_index: index,
      }
    })

    const { data, error } = await supabase
      .from('nomad_featured_works')
      .insert(rows)
      .select()

    if (error) {
      logError(error, { operation: 'replace_featured_works_insert', userId: user.id })
      throw error
    }

    await bumpProfileCacheByUserId(supabase, user.id)
    return NextResponse.json({ success: true, featured_works: data || [] })
  } catch (error) {
    logError(error, { operation: 'replace_featured_works' })
    const errorResponse = formatErrorResponse(error)
    return NextResponse.json(
      { error: errorResponse.error, code: errorResponse.code, details: errorResponse.details },
      { status: errorResponse.statusCode },
    )
  }
}

// Public read by user_id — mirrors the GET on /api/blurbs.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    const supabase = await createServerSupabase()
    const { data, error } = await supabase
      .from('nomad_featured_works')
      .select('*')
      .eq('user_id', userId)
      .order('order_index', { ascending: true })

    if (error) {
      logError(error, { operation: 'fetch_featured_works', userId })
      throw error
    }
    return NextResponse.json({ success: true, featured_works: data || [] })
  } catch (error) {
    logError(error, { operation: 'fetch_featured_works' })
    const errorResponse = formatErrorResponse(error)
    return NextResponse.json(
      { error: errorResponse.error, code: errorResponse.code, details: errorResponse.details },
      { status: errorResponse.statusCode },
    )
  }
}
