import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { formatErrorResponse, logError } from '@/lib/errors'

// Avatars get a hard 5 MB cap — anything bigger is the user's holiday photo,
// not a profile picture. NomadCard renders at 96–120px so we don't need more.
const MAX_SIZE_BYTES = 5 * 1024 * 1024
// MIME → on-disk extension. Single source of truth for both validation
// ("does this MIME pass?") and path construction ("what suffix do we write
// to disk?"). Deriving the extension from the validated MIME instead of
// the user-supplied filename means a malicious filename can't influence
// the path we put in storage.
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

// Uploads a file to the Supabase `avatars` bucket and returns its public URL.
// Path layout: `{user_id}/{timestamp}.{ext}` — putting the user's UUID first
// makes per-user policies trivial if we ever lock the bucket down, and the
// timestamp suffix means re-uploads get a new URL so the CDN doesn't serve
// the old avatar from cache.
//
// We use the admin client because the public site reads avatar URLs without
// auth, and per-user policies on the bucket are easy to misconfigure in
// Supabase Dashboard. Validation happens here so the route is the single
// source of truth for "what counts as a valid upload".
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireUser()
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided', code: 'NO_FILE' }, { status: 400 })
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File too large', code: 'TOO_LARGE' },
        { status: 400 },
      )
    }
    const ext = ALLOWED_TYPES[file.type]
    if (!ext) {
      return NextResponse.json(
        { error: 'Unsupported file type', code: 'BAD_TYPE' },
        { status: 400 },
      )
    }

    const path = `${user.id}/${Date.now()}.${ext}`

    const admin = createAdminSupabase()
    const { error: uploadError } = await admin.storage
      .from('avatars')
      .upload(path, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      logError(uploadError, { operation: 'avatar_upload', userId: user.id, path })
      throw uploadError
    }

    const { data: publicUrl } = admin.storage.from('avatars').getPublicUrl(path)
    return NextResponse.json({ url: publicUrl.publicUrl })
  } catch (err) {
    logError(err, { operation: 'avatar_upload' })
    const r = formatErrorResponse(err)
    return NextResponse.json(
      { error: r.error, code: r.code },
      { status: r.statusCode },
    )
  }
}
