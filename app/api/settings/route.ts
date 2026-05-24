import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/supabase/server'
import { ValidationError, formatErrorResponse, logError } from '@/lib/errors'

const updateSettingsSchema = z.object({
  visibility: z.enum(['public', 'private']).optional(),
  delay_days: z.number().int().min(0).max(365).optional(),
  layout_template: z.enum(['centered', 'card', 'grid', 'minimal']).optional(),
  // theme_color stores the preset key (legacy column name). See lib/themes.ts.
  theme_color: z.enum(['classic', 'midnight', 'sunset', 'mono', 'vivid', 'forest', 'cream']).optional(),
  enabled_sections: z.array(z.string()).optional(),
  section_order: z.array(z.string()).optional(),
  hide_branding: z.boolean().optional(),
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
          visibility: 'public',
          delay_days: 0,
          layout_template: 'centered',
          theme_color: 'classic',
          enabled_sections: ['avatar', 'name', 'location', 'bio', 'stats', 'map', 'status', 'links'],
          section_order: ['avatar', 'name', 'location', 'bio', 'stats', 'map', 'status', 'links'],
          hide_branding: false,
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
