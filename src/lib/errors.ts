import { logger } from './logger'
export class AppError extends Error {
  constructor(
    message: string,
    public code: string = 'UNKNOWN_ERROR',
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'AppError'
    // Prototype chain setup TypeScript-ben
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

/**
 * Validáció hiba
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public details?: Record<string, string[]>
  ) {
    super(message, 'VALIDATION_ERROR', 400)
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

/**
 * Autentikáció hiba
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Autentikáció szükséges') {
    super(message, 'AUTHENTICATION_ERROR', 401)
    Object.setPrototypeOf(this, AuthenticationError.prototype)
  }
}

/**
 * Engedély hiba
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Nincs engedélye ehhez az erőforráshoz') {
    super(message, 'AUTHORIZATION_ERROR', 403)
    Object.setPrototypeOf(this, AuthorizationError.prototype)
  }
}

/**
 * Nem található hiba
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Erőforrás') {
    super(`${resource} nem található`, 'NOT_FOUND_ERROR', 404)
    Object.setPrototypeOf(this, NotFoundError.prototype)
  }
}

/**
 * Adatbázis hiba
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Adatbázis hiba') {
    super(message, 'DATABASE_ERROR', 500)
    Object.setPrototypeOf(this, DatabaseError.prototype)
  }
}

/**
 * Rate limit hiba
 */
export class RateLimitError extends AppError {
  constructor(
    message: string = 'Túl sok kérés. Kérem próbálja később.',
    public retryAfter?: number
  ) {
    super(message, 'RATE_LIMIT_ERROR', 429)
    Object.setPrototypeOf(this, RateLimitError.prototype)
  }
}

/**
 * Error response formatter
 */
export interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: Record<string, string[]>
    retryAfter?: number
  }
}

/**
 * AppError-t konvertál JSON response-ra
 */
export function errorToResponse(error: unknown): {
  body: ErrorResponse
  status: number
  headers: Record<string, string>
} {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (error instanceof RateLimitError && error.retryAfter) {
    headers['Retry-After'] = error.retryAfter.toString()
  }

  if (error instanceof ValidationError) {
    return {
      body: {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      status: error.statusCode,
      headers,
    }
  }

  if (error instanceof AppError) {
    return {
      body: {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      status: error.statusCode,
      headers,
    }
  }

  // Ismeretlen hiba
  const message = error instanceof Error ? error.message : 'Unknown error'
  logger.error('errorToResponse', 'Unexpected error', error)

  return {
    body: {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Szerver hiba történt',
      },
    },
    status: 500,
    headers,
  }
}
