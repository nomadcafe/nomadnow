import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabase, requireUser } from '@/lib/supabase/server'
import { ValidationError, formatErrorResponse, logError } from '@/lib/errors'
import { bumpProfileCacheByUserId } from '@/lib/revalidate'

// Replace-all semantics — same shape as /api/nomad-links. The form always
// submits the full desired blurb set; server wipes and re-inserts. Cap
// at 8 to keep the card from becoming a wall of trivia.
const replaceBlurbsSchema = z.object({
  blurbs: z
    .array(
      z.object({
        label: z.string().min(1).max(30),
        value: z.string().min(1).max(120),
      }),
    )
    .max(8),
})

export async function PUT(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser()
    const body = await request.json()
    const validation = replaceBlurbsSchema.safeParse(body)
    if (!validation.success) {
      throw new ValidationError('Invalid blurb data', validation.error.errors)
    }

    // Wipe-then-insert — same as nomad_links replace-all. If we crash
    // between the two, the user sees no blurbs and can resubmit; less
    // bad than ending up with a duplicate / partial set.
    const { error: deleteError } = await supabase
      .from('nomad_blurbs')
      .delete()
      .eq('user_id', user.id)
    if (deleteError) {
      logError(deleteError, { operation: 'replace_blurbs_delete', userId: user.id })
      throw deleteError
    }

    if (validation.data.blurbs.length === 0) {
      await bumpProfileCacheByUserId(supabase, user.id)
      return NextResponse.json({ success: true, blurbs: [] })
    }

    const rows = validation.data.blurbs.map((blurb, index) => ({
      user_id: user.id,
      label: blurb.label.trim(),
      value: blurb.value.trim(),
      order_index: index,
    }))

    const { data, error } = await supabase
      .from('nomad_blurbs')
      .insert(rows)
      .select()

    if (error) {
      logError(error, { operation: 'replace_blurbs_insert', userId: user.id })
      throw error
    }

    await bumpProfileCacheByUserId(supabase, user.id)
    return NextResponse.json({ success: true, blurbs: data || [] })
  } catch (error) {
    logError(error, { operation: 'replace_blurbs' })
    const errorResponse = formatErrorResponse(error)
    return NextResponse.json(
      { error: errorResponse.error, code: errorResponse.code, details: errorResponse.details },
      { status: errorResponse.statusCode },
    )
  }
}

// Public read by user_id — mirrors the GET on /api/nomad-links.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    const supabase = await createServerSupabase()
    const { data, error } = await supabase
      .from('nomad_blurbs')
      .select('*')
      .eq('user_id', userId)
      .order('order_index', { ascending: true })

    if (error) {
      logError(error, { operation: 'fetch_blurbs', userId })
      throw error
    }
    return NextResponse.json({ success: true, blurbs: data || [] })
  } catch (error) {
    logError(error, { operation: 'fetch_blurbs' })
    const errorResponse = formatErrorResponse(error)
    return NextResponse.json(
      { error: errorResponse.error, code: errorResponse.code, details: errorResponse.details },
      { status: errorResponse.statusCode },
    )
  }
}
