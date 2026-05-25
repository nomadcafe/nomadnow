import { NextRequest, NextResponse } from 'next/server'
import { handleSchema } from '@/lib/validation'
import { NotFoundError, formatErrorResponse, logError } from '@/lib/errors'
import { getProfileByHandle } from '@/lib/profile'

// Public profile fetch. Only loads what the Nomad Card actually renders —
// user row, profile_settings, nomad_links, nomad_stays. The shared
// implementation lives in lib/profile.ts so the server component path
// (app/[handle]/page.tsx) can call it directly without going through HTTP.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  let handle: string = 'unknown'
  try {
    handle = (await params).handle

    const handleValidation = handleSchema.safeParse(handle)
    if (!handleValidation.success) {
      return NextResponse.json(
        { error: 'Invalid handle format', details: handleValidation.error.errors },
        { status: 400 }
      )
    }

    const profile = await getProfileByHandle(handle)
    if (!profile) {
      throw new NotFoundError('User')
    }

    return NextResponse.json(profile, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    logError(error, { operation: 'fetch_profile', handle })
    const errorResponse = formatErrorResponse(error)
    return NextResponse.json(
      { error: errorResponse.error, code: errorResponse.code },
      { status: errorResponse.statusCode }
    )
  }
}
