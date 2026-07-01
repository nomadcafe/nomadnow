import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { formatErrorResponse, logError } from '@/lib/errors'

// "Export my data" — a signed-in user downloads everything they've authored as
// a single JSON file. Table-stakes account hygiene (and a GDPR/portability
// nicety). Reads with the service-role client scoped strictly to the caller's
// own id so the export includes columns the session client can't see
// (billing/plan), but never anyone else's rows.
//
// Deliberately excludes card_views / card_clicks: those describe the user's
// *visitors* (even as coarse daily hashes), not data the owner authored, and
// aren't theirs to export.
export async function GET() {
  try {
    const { user } = await requireUser()
    const admin = createAdminSupabase()

    const [profile, settings, links, stays, blurbs, featuredWorks] = await Promise.all([
      admin.from('users').select('*').eq('id', user.id).maybeSingle(),
      admin.from('profile_settings').select('*').eq('user_id', user.id).maybeSingle(),
      admin.from('nomad_links').select('*').eq('user_id', user.id).order('order_index'),
      admin.from('nomad_stays').select('*').eq('user_id', user.id).order('start_date', { ascending: false }),
      admin.from('nomad_blurbs').select('*').eq('user_id', user.id).order('order_index'),
      admin.from('nomad_featured_works').select('*').eq('user_id', user.id).order('order_index'),
    ])

    const payload = {
      exported_at: new Date().toISOString(),
      account: { id: user.id, email: user.email ?? null },
      profile: profile.data ?? null,
      profile_settings: settings.data ?? null,
      links: links.data ?? [],
      stays: stays.data ?? [],
      blurbs: blurbs.data ?? [],
      featured_works: featuredWorks.data ?? [],
    }

    const handle = (profile.data as { handle?: string } | null)?.handle ?? 'account'
    const filename = `nomadnow-${handle}-export.json`

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    logError(error, { operation: 'account_export' })
    const errorResponse = formatErrorResponse(error)
    return NextResponse.json(
      { error: errorResponse.error, code: errorResponse.code },
      { status: errorResponse.statusCode },
    )
  }
}
