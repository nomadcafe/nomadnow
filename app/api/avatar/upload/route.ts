import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/server'
import { uploadUserImage } from '@/lib/storage'
import { formatErrorResponse, logError } from '@/lib/errors'

// Avatars get a hard 5 MB cap — anything bigger is the user's holiday photo,
// not a profile picture. NomadCard renders at 96–120px so we don't need more.
// All the actual upload logic (MIME check, size cap, path generation,
// Supabase storage upload) lives in lib/storage.ts so the stay-photo route
// can apply identical rules.
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireUser()
    const formData = await request.formData()
    const result = await uploadUserImage({
      userId: user.id,
      file: formData.get('file'),
    })

    if (!result.ok) {
      // Surface a stable HTTP status for the well-known validation failures
      // and 500 for the storage backend failing.
      const status = result.code === 'UPLOAD_FAILED' ? 500 : 400
      if (result.code === 'UPLOAD_FAILED') {
        logError(new Error(result.message), { operation: 'avatar_upload', userId: user.id })
      }
      return NextResponse.json({ error: result.message, code: result.code }, { status })
    }

    return NextResponse.json({ url: result.url })
  } catch (err) {
    logError(err, { operation: 'avatar_upload' })
    const r = formatErrorResponse(err)
    return NextResponse.json(
      { error: r.error, code: r.code },
      { status: r.statusCode },
    )
  }
}
