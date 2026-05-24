import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/supabase/server'
import { ValidationError, formatErrorResponse, logError } from '@/lib/errors'
import { isReservedHandle } from '@/lib/reserved-handles'

const createUserSchema = z.object({
  handle: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/, 'Handle can only contain letters, numbers, underscores, and hyphens'),
  display_name: z.string().max(100).optional(),
  avatar_url: z.string().url().optional().or(z.literal('')),
  country: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  website: z.string().url().optional().or(z.literal('')),
  location: z.string().max(100).optional(),
  role: z.string().max(100).optional(),
  hometown: z.string().max(100).optional(),
  current_city: z.string().max(100).optional(),
  work_status: z.enum(['available', 'busy', 'fulltime', 'freelancing']).optional(),
  timezone: z.string().max(50).optional(),
  visited_countries: z.array(z.string()).optional(),
  profile_type: z.enum(['creator', 'nomad', 'both']).optional(),
})

const updateUserSchema = z.object({
  display_name: z.string().max(100).optional(),
  avatar_url: z.string().url().optional().or(z.literal('')),
  country: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  website: z.string().url().optional().or(z.literal('')),
  location: z.string().max(100).optional(),
  role: z.string().max(100).optional(),
  hometown: z.string().max(100).optional(),
  current_city: z.string().max(100).optional(),
  work_status: z.enum(['available', 'busy', 'fulltime', 'freelancing']).optional(),
  timezone: z.string().max(50).optional(),
  visited_countries: z.array(z.string()).optional(),
  profile_type: z.enum(['creator', 'nomad', 'both']).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser()
    const body = await request.json()

    const validation = createUserSchema.safeParse(body)
    if (!validation.success) {
      throw new ValidationError('Invalid user data', validation.error.errors)
    }

    if (isReservedHandle(validation.data.handle)) {
      throw new ValidationError('Handle is reserved', { handle: 'This handle is reserved' })
    }

    const { data, error } = await supabase
      .from('users')
      .insert({
        id: user.id,
        handle: validation.data.handle,
        display_name: validation.data.display_name,
        avatar_url: validation.data.avatar_url || null,
        country: validation.data.country,
        bio: validation.data.bio,
        website: validation.data.website || null,
        location: validation.data.location,
        role: validation.data.role || null,
        hometown: validation.data.hometown || null,
        current_city: validation.data.current_city || null,
        work_status: validation.data.work_status || 'available',
        timezone: validation.data.timezone || null,
        visited_countries: validation.data.visited_countries || null,
        profile_type: validation.data.profile_type || 'creator',
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new ValidationError('Handle already exists', { handle: 'This handle is already taken' })
      }
      logError(error, { operation: 'create_user', handle: validation.data.handle })
      throw error
    }

    return NextResponse.json({ success: true, user: data })
  } catch (error) {
    logError(error, { operation: 'create_user' })
    const errorResponse = formatErrorResponse(error)
    return NextResponse.json(
      { error: errorResponse.error, code: errorResponse.code, details: errorResponse.details },
      { status: errorResponse.statusCode }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser()
    const body = await request.json()

    const validation = updateUserSchema.safeParse(body)
    if (!validation.success) {
      throw new ValidationError('Invalid update data', validation.error.errors)
    }

    const cleanData = Object.fromEntries(
      Object.entries(validation.data).filter(([, v]) => v !== undefined)
    )

    const { data, error } = await supabase
      .from('users')
      .update({
        ...cleanData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      logError(error, { operation: 'update_user', userId: user.id })
      throw error
    }

    if (!data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, user: data })
  } catch (error) {
    logError(error, { operation: 'update_user' })
    const errorResponse = formatErrorResponse(error)
    return NextResponse.json(
      { error: errorResponse.error, code: errorResponse.code, details: errorResponse.details },
      { status: errorResponse.statusCode }
    )
  }
}
