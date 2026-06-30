import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/server'
import { uploadUserImage } from '@/lib/storage'
import { isPro } from '@/lib/billing'
import { formatErrorResponse, logError } from '@/lib/errors'

// Card background image upload — Pro-only (image backgrounds are gated; see
// the settings API + the Look UI). Same storage path/validation as avatars
// (lib/storage), just filed under a `backgrounds/` prefix so it's easy to
// distinguish from avatars/stay photos. The 5 MB cap inherited from
// uploadUserImage is fine for a full-bleed background at typical screen sizes.
export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser()

    // Gate the upload itself, not just the settings write — no point letting a
    // free user burn storage on an image they can't apply.
    const { data: planRow } = await supabase
      .from('users')
      .select('plan')
      .eq('id', user.id)
      .maybeSingle()
    if (!isPro((planRow as { plan?: string | null } | null)?.plan)) {
      return NextResponse.json(
        { error: 'Image backgrounds are a Pro feature', code: 'PRO_REQUIRED' },
        { status: 403 },
      )
    }

    const formData = await request.formData()
    const result = await uploadUserImage({
      userId: user.id,
      file: formData.get('file'),
      pathPrefix: 'backgrounds',
    })

    if (!result.ok) {
      const status = result.code === 'UPLOAD_FAILED' ? 500 : 400
      if (result.code === 'UPLOAD_FAILED') {
        logError(new Error(result.message), { operation: 'background_upload', userId: user.id })
      }
      return NextResponse.json({ error: result.message, code: result.code }, { status })
    }

    return NextResponse.json({ url: result.url })
  } catch (err) {
    logError(err, { operation: 'background_upload' })
    const r = formatErrorResponse(err)
    return NextResponse.json({ error: r.error, code: r.code }, { status: r.statusCode })
  }
}
