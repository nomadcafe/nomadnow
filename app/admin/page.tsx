import { redirect, notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { isAdminUser } from '@/lib/admin'
import type { ReportReason, ReportStatus } from '@/types/database'
import { ModerationList, type ModerationRow } from '@/components/admin/ModerationList'

// Internal moderation console — never indexed, gated to ADMIN_USER_IDS.
export const metadata: Metadata = { robots: { index: false, follow: false } }

// Always render per-request: it reads live report state via the admin client
// and must never be statically cached.
export const dynamic = 'force-dynamic'

interface ReportRow {
  id: string
  reported_handle: string
  reason: ReportReason
  details: string | null
  status: ReportStatus
  created_at: string
}

export default async function AdminPage() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/admin')
  // notFound (not a redirect) so a signed-in non-admin can't tell the page exists.
  if (!isAdminUser(user.id)) notFound()

  const admin = createAdminSupabase()
  const { data: reportData } = await admin
    .from('reports')
    .select('id, reported_handle, reason, details, status, created_at')
    .order('created_at', { ascending: false })
    .limit(100)
  const reports = (reportData ?? []) as ReportRow[]

  // Current suspended state for each reported handle, fetched once and merged
  // so each row's button reflects reality (a handle may already be suspended).
  const handles = Array.from(new Set(reports.map((r) => r.reported_handle)))
  const suspendedByHandle = new Map<string, boolean>()
  if (handles.length > 0) {
    const { data: users } = await admin
      .from('users')
      .select('handle, suspended')
      .in('handle', handles)
    for (const u of (users ?? []) as { handle: string; suspended: boolean }[]) {
      suspendedByHandle.set(u.handle, u.suspended)
    }
  }

  const rows: ModerationRow[] = reports.map((r) => ({
    id: r.id,
    handle: r.reported_handle,
    reason: r.reason,
    details: r.details,
    status: r.status,
    createdAt: r.created_at,
    // undefined = no live user row (deleted/renamed handle) → not suspendable here
    suspended: suspendedByHandle.get(r.reported_handle),
  }))

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold mb-1">Moderation</h1>
        <p className="text-sm text-gray-500 mb-8">
          {reports.length} report{reports.length === 1 ? '' : 's'} · newest first
        </p>
        <ModerationList initialRows={rows} />
      </div>
    </div>
  )
}
