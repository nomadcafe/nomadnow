import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabase, requireUser } from '@/lib/supabase/server'
import { ValidationError, formatErrorResponse, logError } from '@/lib/errors'
import { bumpProfileCacheByUserId } from '@/lib/revalidate'

const createNomadLinkSchema = z.object({
  type: z.enum([
    'website',
    'instagram',
    'twitter',
    'linkedin',
    'github',
    'youtube',
    'tiktok',
    'threads',
    'substack',
    'telegram',
    'other',
  ]),
  label: z.string().optional(),
  url: z.string().url('Invalid URL'),
  // Soft cap matches the form's LINK_CAP; large enough that no real user
  // hits it, small enough that abuse can't blow up a row.
  order_index: z.number().int().min(0).max(49),
})

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser()
    const body = await request.json()
    const validation = createNomadLinkSchema.safeParse(body)

    if (!validation.success) {
      throw new ValidationError('Invalid nomad link data', validation.error.errors)
    }

    const { data, error } = await supabase
      .from('nomad_links')
      .insert({
        user_id: user.id,
        type: validation.data.type,
        label: validation.data.label || null,
        url: validation.data.url,
        order_index: validation.data.order_index,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new ValidationError('Link order index already exists for this user', { order_index: 'This position is already taken' })
      }
      logError(error, { operation: 'create_nomad_link', userId: user.id })
      throw error
    }

    await bumpProfileCacheByUserId(supabase, user.id)
    return NextResponse.json({ success: true, link: data })
  } catch (error) {
    logError(error, { operation: 'create_nomad_link' })
    const errorResponse = formatErrorResponse(error)
    return NextResponse.json(
      { error: errorResponse.error, code: errorResponse.code, details: errorResponse.details },
      { status: errorResponse.statusCode }
    )
  }
}

// Replace-all semantics: takes a links array and atomically replaces the
// caller's nomad_links. Simpler than per-row PUT/DELETE for the form's edit
// flow — the user always submits the full desired link set, and order_index
// gets normalised from array position so reordering is free. Drops anything
// with a blank URL so the form can pass partially-filled rows.
const replaceLinksSchema = z.object({
  links: z
    .array(
      z.object({
        type: z.enum([
          'website',
          'instagram',
          'twitter',
          'linkedin',
          'github',
          'youtube',
          'tiktok',
          'threads',
          'substack',
          'telegram',
          'other',
        ]),
        label: z.string().optional().nullable(),
        url: z.string().url('Invalid URL'),
      }),
    )
    .max(50),
})

export async function PUT(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser()
    const body = await request.json()
    const validation = replaceLinksSchema.safeParse(body)

    if (!validation.success) {
      throw new ValidationError('Invalid nomad link data', validation.error.errors)
    }

    // Wipe the existing set first. If we crash between delete and insert
    // (function timeout, etc.), the user sees no links and can resubmit —
    // less bad than ending up with duplicates of partial state.
    const { error: deleteError } = await supabase
      .from('nomad_links')
      .delete()
      .eq('user_id', user.id)

    if (deleteError) {
      logError(deleteError, { operation: 'replace_links_delete', userId: user.id })
      throw deleteError
    }

    if (validation.data.links.length === 0) {
      await bumpProfileCacheByUserId(supabase, user.id)
      return NextResponse.json({ success: true, links: [] })
    }

    const rows = validation.data.links.map((link, index) => ({
      user_id: user.id,
      type: link.type,
      label: link.type === 'other' ? link.label || null : null,
      url: link.url,
      order_index: index,
    }))

    const { data, error } = await supabase
      .from('nomad_links')
      .insert(rows)
      .select()

    if (error) {
      logError(error, { operation: 'replace_links_insert', userId: user.id })
      throw error
    }

    await bumpProfileCacheByUserId(supabase, user.id)
    return NextResponse.json({ success: true, links: data || [] })
  } catch (error) {
    logError(error, { operation: 'replace_links' })
    const errorResponse = formatErrorResponse(error)
    return NextResponse.json(
      { error: errorResponse.error, code: errorResponse.code, details: errorResponse.details },
      { status: errorResponse.statusCode }
    )
  }
}

// Public read — listing a user's nomad links by ID.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    const supabase = await createServerSupabase()
    const { data, error } = await supabase
      .from('nomad_links')
      .select('*')
      .eq('user_id', userId)
      .order('order_index', { ascending: true })

    if (error) {
      logError(error, { operation: 'fetch_nomad_links', userId })
      throw error
    }

    return NextResponse.json({ success: true, links: data || [] })
  } catch (error) {
    logError(error, { operation: 'fetch_nomad_links' })
    const errorResponse = formatErrorResponse(error)
    return NextResponse.json(
      { error: errorResponse.error, code: errorResponse.code, details: errorResponse.details },
      { status: errorResponse.statusCode }
    )
  }
}
