import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/supabase/server'
import { ValidationError, formatErrorResponse, logError } from '@/lib/errors'
import { bumpProfileCacheByUserId } from '@/lib/revalidate'

// Settings the user can actually change today. Dropped fields (visibility,
// delay_days, layout_template, enabled_sections) had UI but were never read
// anywhere — the row keeps those columns for backward compat with old data,
// we just stop writing them.
// Hex pattern shared with the renderer (lib/card-background.ts). 3/6/8
// digit forms cover the colour-picker dialect plus alpha if the user
// pastes one in manually.
const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

const backgroundValueSchema = z
  .union([
    z.object({ color: z.string().regex(HEX, 'Invalid hex color') }),
    z.object({
      from: z.string().regex(HEX, 'Invalid hex color'),
      to: z.string().regex(HEX, 'Invalid hex color'),
      angle: z.number().min(0).max(360),
    }),
    z.null(),
  ])
  .optional()

const updateSettingsSchema = z.object({
  // theme_color stores the preset key (legacy column name). See lib/themes.ts.
  theme_color: z.enum(['classic', 'midnight', 'sunset', 'mono', 'vivid', 'forest', 'cream']).optional(),
  // Corner-radius preset for link buttons. Defaults to 'rounded' at the DB level.
  button_shape: z.enum(['pill', 'rounded', 'square']).optional(),
  // Custom outer-card background. See lib/card-background.ts for the
  // rendering rules. background_value's shape varies with mode; the
  // resolver gracefully degrades to the theme default on mismatch.
  background_mode: z.enum(['theme', 'solid', 'gradient']).optional(),
  background_value: backgroundValueSchema,
  // Font override key. 'theme' is equivalent to NULL (use the theme's
  // font). See lib/fonts.ts for the curated list.
  font_family: z.enum(['theme', 'inter', 'jakarta', 'fraunces', 'mono']).nullable().optional(),
  // Hex accent override (e.g. #FF6B35). Null clears the override and falls
  // back to the theme preset's accentHex. Same HEX shape as background_value.
  accent_color: z.string().regex(HEX, 'Invalid hex color').nullable().optional(),
  // The Nomad Card catalog has ~8 section IDs and each is a short string —
  // anything bigger is junk or abuse. Defensive caps so a malformed POST
  // can't blow up a row size or shove a giant JSONB blob into the DB.
  section_order: z.array(z.string().max(50)).max(20).optional(),
})

export async function PUT(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser()
    const body = await request.json()
    const validation = updateSettingsSchema.safeParse(body)

    if (!validation.success) {
      throw new ValidationError('Invalid settings data', validation.error.errors)
    }

    const cleanData = Object.fromEntries(
      Object.entries(validation.data).filter(([, v]) => v !== undefined)
    )

    const { data: existingSettings } = await supabase
      .from('profile_settings')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingSettings) {
      const { data, error } = await supabase
        .from('profile_settings')
        .update({
          ...cleanData,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        logError(error, { operation: 'update_settings', userId: user.id })
        throw error
      }

      await bumpProfileCacheByUserId(supabase, user.id)
      return NextResponse.json({ success: true, settings: data })
    } else {
      const { data, error } = await supabase
        .from('profile_settings')
        .insert({
          user_id: user.id,
          ...cleanData,
        })
        .select()
        .single()

      if (error) {
        logError(error, { operation: 'create_settings', userId: user.id })
        throw error
      }

      await bumpProfileCacheByUserId(supabase, user.id)
      return NextResponse.json({ success: true, settings: data })
    }
  } catch (error) {
    logError(error, { operation: 'update_settings' })
    const errorResponse = formatErrorResponse(error)
    return NextResponse.json(
      { error: errorResponse.error, code: errorResponse.code, details: errorResponse.details },
      { status: errorResponse.statusCode }
    )
  }
}

export async function GET() {
  try {
    const { supabase, user } = await requireUser()

    const { data, error } = await supabase
      .from('profile_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      logError(error, { operation: 'get_settings', userId: user.id })
      throw error
    }

    if (!data) {
      // Default to nomad-flavored settings. Round-trip safe: PUT-ing this
      // payload back unchanged passes the Zod schema (theme_color is a valid
      // preset key; sections match the Nomad Card catalog).
      return NextResponse.json({
        success: true,
        settings: {
          user_id: user.id,
          theme_color: 'classic',
          button_shape: 'rounded',
          background_mode: 'theme',
          background_value: null,
          font_family: 'theme',
          section_order: ['avatar', 'name', 'location', 'bio', 'stats', 'map', 'status', 'links'],
        },
      })
    }

    return NextResponse.json({ success: true, settings: data })
  } catch (error) {
    logError(error, { operation: 'get_settings' })
    const errorResponse = formatErrorResponse(error)
    return NextResponse.json(
      { error: errorResponse.error, code: errorResponse.code },
      { status: errorResponse.statusCode }
    )
  }
}
