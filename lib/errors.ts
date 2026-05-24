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

  if (error instanceof Error) {
    return {
      error: error.message,
      statusCode: 500,
    }
  }

  return {
    error: 'Internal server error',
    statusCode: 500,
  }
}

/**
 * Log error with context
 */
export function logError(error: unknown, context?: Record<string, unknown>) {
  const errorInfo = formatErrorResponse(error)
  console.error('Error:', {
    ...errorInfo,
    ...context,
    timestamp: new Date().toISOString(),
  })
}





