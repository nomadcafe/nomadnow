import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabase, requireUser } from '@/lib/supabase/server'
import { ValidationError, formatErrorResponse, logError } from '@/lib/errors'

const createNomadLinkSchema = z.object({
  type: z.enum(['instagram', 'linkedin', 'website', 'twitter', 'other']),
  label: z.string().optional(),
  url: z.string().url('Invalid URL'),
  order_index: z.number().int().min(0).max(2),
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
