import { createAdminSupabase } from './supabase/admin'

// Shared image upload logic for the few places we accept user-supplied
// pictures (avatars, stay photos). Both kinds of upload go to the same
// `avatars` Supabase Storage bucket — keeping a single bucket means we
// only need to maintain one public-read policy. Per-user paths
// (`${user_id}/...`) make it trivial to scope per-user policies later
// if the bucket ever gets locked down.
//
// The same validation rules apply to every upload site:
//   - MIME must be in the image allow-list (jpeg / png / webp / gif)
//   - Size must be ≤ MAX_SIZE_BYTES
//   - Extension is derived from the validated MIME, never the filename
//     (a malicious filename can't influence where we write on disk)

const MAX_SIZE_BYTES = 5 * 1024 * 1024

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export type UploadFailureCode = 'NO_FILE' | 'TOO_LARGE' | 'BAD_TYPE' | 'UPLOAD_FAILED'

export type UploadResult =
  | { ok: true; url: string }
  | { ok: false; code: UploadFailureCode; message: string }

/**
 * Uploads an image to the `avatars` bucket under the user's UUID. Returns
 * a public URL on success, or a structured failure (caller maps to the
 * right HTTP status). Pass `pathPrefix` to put the file in a subfolder
 * (e.g. "stays" for stay photos). The leading `${userId}/` segment is
 * always added so files stay namespaced per user.
 */
export async function uploadUserImage(opts: {
  userId: string
  file: unknown
  pathPrefix?: string
}): Promise<UploadResult> {
  const { userId, file, pathPrefix } = opts
  if (!(file instanceof File)) {
    return { ok: false, code: 'NO_FILE', message: 'No file provided' }
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { ok: false, code: 'TOO_LARGE', message: 'File too large' }
  }
  const ext = ALLOWED_TYPES[file.type]
  if (!ext) {
    return { ok: false, code: 'BAD_TYPE', message: 'Unsupported file type' }
  }

  // Timestamp suffix means re-uploads produce a new URL — the CDN can't
  // serve stale content from cache after the user changes the image.
  const prefix = pathPrefix ? `${pathPrefix}/` : ''
  const path = `${userId}/${prefix}${Date.now()}.${ext}`

  const admin = createAdminSupabase()
  const { error: uploadError } = await admin.storage
    .from('avatars')
    .upload(path, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    })
  if (uploadError) {
    return { ok: false, code: 'UPLOAD_FAILED', message: uploadError.message }
  }

  const { data } = admin.storage.from('avatars').getPublicUrl(path)
  return { ok: true, url: data.publicUrl }
}
