import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { formatErrorResponse, logError } from '@/lib/errors'

// Returns the caller's own billing fields. Exists because end-user roles
// had SELECT on the billing columns of `public.users` revoked in migration
// 0007 — meaning the client-side settings page can no longer query them
// directly via supabase-js even for its own row. This route does the read
// through the admin client (server-side, after requireUser) so only the
// authenticated owner sees their own data.
export async function GET() {
  try {
    const { user } = await requireUser()
    const admin = createAdminSupabase()
    const { data, error } = await admin
      .from('users')
      .select('plan,subscription_status,current_period_end')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      logError(error, { operation: 'billing_state', userId: user.id })
      throw error
    }

    return NextResponse.json({
      plan: (data?.plan as 'basic' | 'pro' | null) ?? null,
      status: (data?.subscription_status as string | null) ?? null,
      currentPeriodEnd: (data?.current_period_end as string | null) ?? null,
    })
  } catch (err) {
    logError(err, { operation: 'billing_state' })
    const r = formatErrorResponse(err)
    return NextResponse.json(
      { error: r.error, code: r.code },
      { status: r.statusCode },
    )
  }
}
