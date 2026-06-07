import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { isAdminUser } from '@/lib/admin'
import { bumpProfileCache } from '@/lib/revalidate'
import { handleSchema } from '@/lib/validation'
import { ValidationError, formatErrorResponse, logError } from '@/lib/errors'

// Card takedown kill switch. Flips users.suspended for a handle and — crucially
// — invalidates the profile cache immediately, so a phishing/malware card stops
// rendering within the request rather than after the ≤60s cache TTL. Replaces
// the manual DB toggle the kill switch previously required.
const bodySchema = z.object({
  handle: handleSchema,
  suspended: z.boolean(),
})

export async function POST(request: Request) {
  try {
    const { user } = await requireUser()
    if (!isAdminUser(user.id)) {
      // 404, not 403: don't confirm the route exists to a non-admin.
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError('Invalid payload', parsed.error.errors)
    }
    const { handle, suspended } = parsed.data
    const lower = handle.toLowerCase()

    const admin = createAdminSupabase()
    const { data, error } = await admin
      .from('users')
      .update({ suspended, updated_at: new Date().toISOString() })
      .eq('handle', lower)
      .select('handle')
      .maybeSingle()
    if (error) throw error
    if (!data) {
      return NextResponse.json({ error: 'Handle not found' }, { status: 404 })
    }

    // Resolve the open reports for this handle: suspending actions them,
    // un-suspending dismisses them. Best-effort — a failure here must not
    // block the takedown itself, which already succeeded above.
    const { error: reportErr } = await admin
      .from('reports')
      .update({ status: suspended ? 'actioned' : 'dismissed' })
      .eq('reported_handle', lower)
      .in('status', ['open', 'reviewing'])
    if (reportErr) {
      logError(reportErr, { operation: 'admin_suspend.report_status', handle: lower })
    }

    // Instant takedown — drop the cached profile now instead of waiting out
    // the TTL. revalidatePath inside also clears the rendered route.
    bumpProfileCache(lower)

    return NextResponse.json({ success: true, handle: lower, suspended })
  } catch (error) {
    logError(error, { operation: 'admin_suspend' })
    const r = formatErrorResponse(error)
    // Full detail is logged above; don't echo an unexpected internal message
    // (e.g. a missing-service-key error) back in the HTTP body.
    const message = r.statusCode === 500 ? 'Internal error' : r.error
    return NextResponse.json({ error: message, code: r.code, details: r.details }, { status: r.statusCode })
  }
}
