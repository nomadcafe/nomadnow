import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { handleSchema } from '@/lib/validation'
import { NotFoundError, formatErrorResponse, logError } from '@/lib/errors'

// Public profile fetch. Only loads what the Nomad Card actually renders —
// user row, profile_settings, nomad_links. The legacy creator joins (projects,
// revenues, milestones, social_accounts, social_metrics) were removed with the
// Creator Profile wedge.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  let handle: string = 'unknown'
  try {
    handle = (await params).handle

    const handleValidation = handleSchema.safeParse(handle)
    if (!handleValidation.success) {
      return NextResponse.json(
        { error: 'Invalid handle format', details: handleValidation.error.errors },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabase()

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('handle', handle)
      .single()

    if (userError || !user) {
      throw new NotFoundError('User')
    }

    const [settingsResult, nomadLinksResult, nomadStaysResult] = await Promise.all([
      supabase
        .from('profile_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('nomad_links')
        .select('*')
        .eq('user_id', user.id)
        .order('order_index', { ascending: true }),
      supabase
        .from('nomad_stays')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false }),
    ])

    return NextResponse.json(
      {
        user,
        settings: settingsResult.data || undefined,
        nomadLinks: nomadLinksResult.data || [],
        nomadStays: nomadStaysResult.data || [],
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    )
  } catch (error) {
    logError(error, { operation: 'fetch_profile', handle })
    const errorResponse = formatErrorResponse(error)
    return NextResponse.json(
      { error: errorResponse.error, code: errorResponse.code },
      { status: errorResponse.statusCode }
    )
  }
}
