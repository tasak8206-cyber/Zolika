import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  DatabaseError,
  RateLimitError,
  errorToResponse,
} from '../errors'

// ─── Error Classes ────────────────────────────────────────────────────────────

describe('AppError', () => {
  it('sets message, code, and statusCode correctly', () => {
    const err = new AppError('Something went wrong', 'TEST_ERROR', 418)
    expect(err.message).toBe('Something went wrong')
    expect(err.code).toBe('TEST_ERROR')
    expect(err.statusCode).toBe(418)
    expect(err.name).toBe('AppError')
  })

  it('uses defaults for code and statusCode when omitted', () => {
    const err = new AppError('Oops')
    expect(err.code).toBe('UNKNOWN_ERROR')
    expect(err.statusCode).toBe(500)
  })

  it('is an instance of Error', () => {
    const err = new AppError('msg')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(AppError)
  })
})

describe('ValidationError', () => {
  it('has code VALIDATION_ERROR and statusCode 400', () => {
    const err = new ValidationError('Bad input')
    expect(err.code).toBe('VALIDATION_ERROR')
    expect(err.statusCode).toBe(400)
  })

  it('stores optional details', () => {
    const details = { email: ['Invalid email'] }
    const err = new ValidationError('Validation failed', details)
    expect(err.details).toEqual(details)
  })

  it('is an instance of AppError', () => {
    expect(new ValidationError('msg')).toBeInstanceOf(AppError)
  })
})

describe('AuthenticationError', () => {
  it('has code AUTHENTICATION_ERROR and statusCode 401', () => {
    const err = new AuthenticationError()
    expect(err.code).toBe('AUTHENTICATION_ERROR')
    expect(err.statusCode).toBe(401)
  })

  it('uses default message when none provided', () => {
    const err = new AuthenticationError()
    expect(err.message).toBeTruthy()
  })

  it('accepts a custom message', () => {
    const err = new AuthenticationError('Token expired')
    expect(err.message).toBe('Token expired')
  })
})

describe('AuthorizationError', () => {
  it('has code AUTHORIZATION_ERROR and statusCode 403', () => {
    const err = new AuthorizationError()
    expect(err.code).toBe('AUTHORIZATION_ERROR')
    expect(err.statusCode).toBe(403)
  })
})

describe('NotFoundError', () => {
  it('has code NOT_FOUND_ERROR and statusCode 404', () => {
    const err = new NotFoundError('Product')
    expect(err.code).toBe('NOT_FOUND_ERROR')
    expect(err.statusCode).toBe(404)
    expect(err.message).toContain('Product')
  })

  it('uses default resource name when none provided', () => {
    const err = new NotFoundError()
    expect(err.message).toBeTruthy()
  })
})

describe('DatabaseError', () => {
  it('has code DATABASE_ERROR and statusCode 500', () => {
    const err = new DatabaseError()
    expect(err.code).toBe('DATABASE_ERROR')
    expect(err.statusCode).toBe(500)
  })
})

describe('RateLimitError', () => {
  it('has code RATE_LIMIT_ERROR and statusCode 429', () => {
    const err = new RateLimitError()
    expect(err.code).toBe('RATE_LIMIT_ERROR')
    expect(err.statusCode).toBe(429)
  })

  it('stores retryAfter value', () => {
    const err = new RateLimitError('Too many requests', 60)
    expect(err.retryAfter).toBe(60)
  })
})

// ─── errorToResponse ──────────────────────────────────────────────────────────

describe('errorToResponse', () => {
  it('returns 400 with VALIDATION_ERROR for ValidationError', () => {
    const err = new ValidationError('Bad input', { field: ['Required'] })
    const response = errorToResponse(err)
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
    expect(response.body.error.details).toEqual({ field: ['Required'] })
    expect(response.headers['Content-Type']).toBe('application/json')
  })

  it('returns 401 with AUTHENTICATION_ERROR for AuthenticationError', () => {
    const err = new AuthenticationError()
    const response = errorToResponse(err)
    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('AUTHENTICATION_ERROR')
  })

  it('returns 403 with AUTHORIZATION_ERROR for AuthorizationError', () => {
    const err = new AuthorizationError()
    const response = errorToResponse(err)
    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('AUTHORIZATION_ERROR')
  })

  it('returns 404 with NOT_FOUND_ERROR for NotFoundError', () => {
    const err = new NotFoundError('Item')
    const response = errorToResponse(err)
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('NOT_FOUND_ERROR')
  })

  it('returns 429 with Retry-After header for RateLimitError with retryAfter', () => {
    const err = new RateLimitError('Slow down', 30)
    const response = errorToResponse(err)
    expect(response.status).toBe(429)
    expect(response.headers['Retry-After']).toBe('30')
  })

  it('does not include Retry-After header when retryAfter is undefined', () => {
    const err = new RateLimitError('Slow down')
    const response = errorToResponse(err)
    expect(response.status).toBe(429)
    expect(response.headers['Retry-After']).toBeUndefined()
  })

  it('returns 500 INTERNAL_SERVER_ERROR for unknown errors', () => {
    const response = errorToResponse(new Error('Unknown failure'))
    expect(response.status).toBe(500)
    expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR')
  })

  it('returns 500 INTERNAL_SERVER_ERROR for non-Error values', () => {
    const response = errorToResponse('some string error')
    expect(response.status).toBe(500)
    expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR')
  })

  it('returns 500 for null input', () => {
    const response = errorToResponse(null)
    expect(response.status).toBe(500)
    expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR')
  })

  it('includes details for AppError subclass (ValidationError) but not for plain AppError', () => {
    const plain = new AppError('plain error', 'PLAIN', 400)
    const response = errorToResponse(plain)
    expect(response.body.error.details).toBeUndefined()
  })
})
