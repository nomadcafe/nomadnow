import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { handleSchema } from '@/lib/validation'
import { NotFoundError, formatErrorResponse, logError } from '@/lib/errors'

// Public profile fetch. Only loads what the Nomad Card actually renders —
// user row, profile_settings, nomad_links. The legacy creator joins (projects,
// revenues, milestones, social_accounts, social_metrics) were removed with the
// Creator Profile wedge.

// Explicit allow-list of columns safe to return on a public profile request.
// NEVER add billing columns (stripe_customer_id, subscription_id,
// subscription_status, current_period_end) — they leak Stripe identifiers
// to any visitor. `plan` is intentionally included so the public card can
// render Pro-only features; that one is fine to expose.
// Supabase's typed client parses this as a comma-separated list — keep
// it as a single no-whitespace string so the generated row type stays
// inferable (whitespace makes it fall back to `GenericStringError`).
const PUBLIC_USER_COLUMNS =
  'id,handle,display_name,avatar_url,country,bio,website,location,role,current_city,work_status,timezone,visited_countries,profile_type,plan,created_at,updated_at' as const
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
      .select(PUBLIC_USER_COLUMNS)
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
