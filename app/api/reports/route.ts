import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { ValidationError, formatErrorResponse, logError } from '@/lib/errors'
import { checkRateLimit } from '@/lib/rate-limit'
import { notifyAbuseReport } from '@/lib/notify'
import { handleSchema } from '@/lib/validation'

// Anonymous abuse reporting for public cards. Visitors who aren't logged in
// are exactly who spots a phishing/malware/impersonation card, so this takes
// no auth — abuse is bounded by IP rate-limit + a honeypot field instead.
//
// The row is written with the service-role client because the reports table
// is RLS-locked with no anon policy (see migration 0026): visitors can create
// reports through this endpoint but can never read them back.
const reportSchema = z.object({
  handle: handleSchema,
  reason: z.enum(['phishing', 'malware', 'impersonation', 'spam', 'other']),
  details: z.string().max(1000).optional().nullable(),
  // Honeypot: a field hidden from real users via CSS. Bots that blindly fill
  // every input trip it. Named to look legitimate ("website") so naive bots
  // target it. Non-empty => silently accept-and-drop so the bot sees success.
  website: z.string().optional(),
})

function clientIp(request: NextRequest): string {
  // Vercel / proxies set x-forwarded-for as a comma list, client first.
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request)

    // Stricter intent than a content edit: a visitor never legitimately files
    // a flood of reports. Reuse the shared sliding window, keyed separately so
    // it doesn't share a budget with the user's other API calls.
    const limit = await checkRateLimit(`report:${ip}`)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many reports. Try again later.', code: 'RATE_LIMITED' },
        { status: 429 },
      )
    }

    const body = await request.json()
    const validation = reportSchema.safeParse(body)
    if (!validation.success) {
      throw new ValidationError('Invalid report', validation.error.errors)
    }
    const { handle, reason, details, website } = validation.data

    // Honeypot tripped — pretend success without writing anything, so the bot
    // gets no signal that its submission was rejected.
    if (website && website.length > 0) {
      return NextResponse.json({ success: true })
    }

    // Resolve the reported handle to a user id for convenience (nullable — a
    // report on a since-deleted/renamed handle is still worth keeping). Uses
    // the request-scoped anon client; only the public id is read.
    const supabase = await createServerSupabase()
    const { data: target } = await supabase
      .from('users')
      .select('id')
      .eq('handle', handle.toLowerCase())
      .maybeSingle()

    const cleanDetails = details?.trim() ? details.trim() : null

    const admin = createAdminSupabase()
    const { data: inserted, error } = await admin
      .from('reports')
      .insert({
        reported_handle: handle.toLowerCase(),
        reported_user_id: target?.id ?? null,
        reason,
        details: cleanDetails,
        reporter_ip: ip,
      })
      .select('id')
      .single()

    if (error) {
      logError(error, { operation: 'create_report', handle })
      throw error
    }

    // Wake the operator. Awaited (cheap, fail-open) so a serverless function
    // doesn't terminate before the webhook fetch fires.
    await notifyAbuseReport({ id: inserted.id, handle, reason, details: cleanDetails })

    return NextResponse.json({ success: true })
  } catch (error) {
    logError(error, { operation: 'create_report' })
    const errorResponse = formatErrorResponse(error)
    return NextResponse.json(
      { error: errorResponse.error, code: errorResponse.code, details: errorResponse.details },
      { status: errorResponse.statusCode },
    )
  }
}
