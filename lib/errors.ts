/**
 * Custom error classes for better error handling
 */

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR')
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND')
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN')
  }
}

/**
 * Error response formatter
 */
export function formatErrorResponse(error: unknown): {
  error: string
  code?: string
  details?: unknown
  statusCode: number
} {
  if (error instanceof AppError) {
    return {
      error: error.message,
      code: error.code,
      details: error instanceof ValidationError ? error.details : undefined,
      statusCode: error.statusCode,
    }
  }

  // Unexpected error → generic message. Never echo error.message to the client:
  // a thrown DB/RLS error, or "SUPABASE_SERVICE_ROLE_KEY is not configured",
  // leaks internals. The real detail is preserved server-side by logError.
  return {
    error: 'Internal server error',
    statusCode: 500,
  }
}

/**
 * Log error with context
 */
export function logError(error: unknown, context?: Record<string, unknown>) {
  // Log the real error detail server-side (formatErrorResponse now masks
  // unexpected errors for the client, so we must not route logging through it
  // or the message/stack would be lost).
  console.error('Error:', {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...(error instanceof AppError
      ? { code: error.code, statusCode: error.statusCode }
      : {}),
    ...context,
    timestamp: new Date().toISOString(),
  })
}





