import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/server'
import { uploadUserImage } from '@/lib/storage'
import { formatErrorResponse, logError } from '@/lib/errors'

// Stay photo uploads share the same `avatars` bucket and validation rules
// as profile avatars, but land in `${user_id}/stays/...` so the file
// listing stays scannable. Logic lives in lib/storage.ts.
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireUser()
    const formData = await request.formData()
    const result = await uploadUserImage({
      userId: user.id,
      file: formData.get('file'),
      pathPrefix: 'stays',
    })

    if (!result.ok) {
      const status = result.code === 'UPLOAD_FAILED' ? 500 : 400
      if (result.code === 'UPLOAD_FAILED') {
        logError(new Error(result.message), { operation: 'stay_photo_upload', userId: user.id })
      }
      return NextResponse.json({ error: result.message, code: result.code }, { status })
    }

    return NextResponse.json({ url: result.url })
  } catch (err) {
    logError(err, { operation: 'stay_photo_upload' })
    const r = formatErrorResponse(err)
    return NextResponse.json(
      { error: r.error, code: r.code },
      { status: r.statusCode },
    )
  }
}
