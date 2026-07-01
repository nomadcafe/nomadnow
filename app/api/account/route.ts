import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { formatErrorResponse, logError } from '@/lib/errors'

// Permanent account deletion. Everything the user authored is removed by the
// ON DELETE CASCADE on users(id) (profile_settings, nomad_links/stays/blurbs/
// featured_works, card_views/clicks), so deleting the users row is the single
// source of truth for app data. Two things cascade can't reach:
//   1. the auth.users identity — deleted via auth.admin.deleteUser, else the
//      account could still "log in" into an empty shell.
//   2. uploaded files in the `avatars` storage bucket — removed best-effort
//      from the URLs recorded on the profile before the rows disappear.
//
// Ordering: gather storage paths → delete the users row (removes the public
// card + all app data via cascade) → best-effort auth + storage cleanup. The
// row delete goes FIRST and is the must-succeed step: the worst outcome to
// avoid is a live, ownerless "zombie" card, which auth-first-then-row-fails
// would leave behind. A lingering auth login with no profile is harmless by
// comparison (it just lands on /create-card), so its deletion is best-effort.
// All writes use the service-role client (RLS/grant-independent), scoped
// strictly to user.id.

const STORAGE_BUCKET = 'avatars'

// Public storage URLs look like
// https://<proj>.supabase.co/storage/v1/object/public/avatars/<path>. Pull the
// object path (everything after the bucket segment) so it can be removed.
function storagePathFromUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null
  const marker = `/object/public/${STORAGE_BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  const path = url.slice(idx + marker.length)
  return path ? decodeURIComponent(path) : null
}

export async function DELETE() {
  try {
    const { user } = await requireUser()
    const admin = createAdminSupabase()

    // Collect every file this user parked in the avatars bucket (avatar,
    // custom card background, stay photos) before their rows are deleted.
    const [{ data: profile }, { data: settings }, { data: stays }] = await Promise.all([
      admin.from('users').select('avatar_url').eq('id', user.id).maybeSingle(),
      admin.from('profile_settings').select('background_mode, background_value').eq('user_id', user.id).maybeSingle(),
      admin.from('nomad_stays').select('photo_urls').eq('user_id', user.id),
    ])

    const paths = new Set<string>()
    const add = (u: unknown) => {
      const p = storagePathFromUrl(u)
      if (p) paths.add(p)
    }
    add(profile?.avatar_url)
    if (settings?.background_mode === 'image') add(settings?.background_value)
    for (const stay of stays ?? []) {
      const photos = (stay as { photo_urls?: unknown }).photo_urls
      if (Array.isArray(photos)) photos.forEach(add)
    }

    // Delete the profile row first — cascades all app data and removes the
    // public card immediately. This is the must-succeed step.
    const { error: dbError } = await admin.from('users').delete().eq('id', user.id)
    if (dbError) {
      logError(dbError, { operation: 'delete_account_db', userId: user.id })
      throw dbError
    }

    // Best-effort: remove the auth identity. A failure here leaves a login with
    // no profile (harmless — it lands on /create-card), so it never fails the
    // request now that the card + data are already gone.
    const { error: authError } = await admin.auth.admin.deleteUser(user.id)
    if (authError) {
      logError(authError, { operation: 'delete_account_auth', userId: user.id })
    }

    // Best-effort: orphaned storage files are harmless too.
    if (paths.size > 0) {
      const { error: storageError } = await admin.storage
        .from(STORAGE_BUCKET)
        .remove(Array.from(paths))
      if (storageError) {
        logError(storageError, { operation: 'delete_account_storage', userId: user.id })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logError(error, { operation: 'delete_account' })
    const errorResponse = formatErrorResponse(error)
    return NextResponse.json(
      { error: errorResponse.error, code: errorResponse.code },
      { status: errorResponse.statusCode },
    )
  }
}
