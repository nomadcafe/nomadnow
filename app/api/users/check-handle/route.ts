import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { handleSchema } from '@/lib/validation'
import { formatErrorResponse, logError } from '@/lib/errors'
import { isReservedHandle } from '@/lib/reserved-handles'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const handle = searchParams.get('handle')

    if (!handle) {
      return NextResponse.json(
        { error: 'Handle parameter is required' },
        { status: 400 }
      )
    }

    // Normalize handle (lowercase)
    const normalizedHandle = handle.trim().toLowerCase()

    // Validate handle format
    const handleValidation = handleSchema.safeParse(normalizedHandle)
    if (!handleValidation.success) {
      return NextResponse.json({
        available: false,
        valid: false,
        error: handleValidation.error.errors[0]?.message || 'Invalid handle format',
      })
    }

    // Reject reserved handles before hitting the DB.
    if (isReservedHandle(normalizedHandle)) {
      return NextResponse.json({
        available: false,
        valid: true,
        error: 'This handle is reserved',
      })
    }

    // Check if handle exists
    const supabase = await createServerSupabase()
    const { data, error } = await supabase
      .from('users')
      .select('handle')
      .eq('handle', normalizedHandle)
      .maybeSingle()

    if (error) {
      logError(error, { operation: 'check_handle', handle: normalizedHandle })
      // If there's an error, assume it's available (optimistic)
      return NextResponse.json({
        available: true,
        valid: true,
      })
    }

    const available = !data

    return NextResponse.json({
      available,
      valid: true,
      handle: normalizedHandle,
    })
  } catch (error) {
    logError(error, { operation: 'check_handle' })
    const errorResponse = formatErrorResponse(error)
    return NextResponse.json(
      { error: errorResponse.error, code: errorResponse.code },
      { status: errorResponse.statusCode }
    )
  }
}





