// We mock the Next.js `cookies` API since it's only available in a server context.
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}))

// We mock the `crypto` module to control randomness in token generation.
jest.mock('crypto', () => {
  const actual = jest.requireActual<typeof import('crypto')>('crypto')
  return {
    ...actual,
    randomBytes: jest.fn(actual.randomBytes),
    timingSafeEqual: jest.fn(actual.timingSafeEqual),
  }
})

import { cookies } from 'next/headers'
import crypto from 'crypto'
import {
  generateCSRFToken,
  verifyCSRFToken,
  validateCSRFMiddleware,
  createCSRFErrorResponse,
} from '../csrf'

const mockedCookies = cookies as jest.MockedFunction<typeof cookies>
const mockedRandomBytes = crypto.randomBytes as jest.MockedFunction<typeof crypto.randomBytes>
const mockedTimingSafeEqual = crypto.timingSafeEqual as jest.MockedFunction<typeof crypto.timingSafeEqual>

// ─── generateCSRFToken ────────────────────────────────────────────────────────

describe('generateCSRFToken', () => {
  it('generates a 64-character hex token and stores it in a cookie', async () => {
    const mockSet = jest.fn()
    mockedCookies.mockResolvedValue({ set: mockSet, get: jest.fn() } as any)

    const token = await generateCSRFToken()

    expect(token).toMatch(/^[0-9a-f]{64}$/)
    expect(mockSet).toHaveBeenCalledWith(
      'csrf-token',
      token,
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 3600,
        path: '/',
      })
    )
  })

  it('generates a unique token on each call', async () => {
    const mockSet = jest.fn()
    mockedCookies.mockResolvedValue({ set: mockSet, get: jest.fn() } as any)

    const token1 = await generateCSRFToken()
    const token2 = await generateCSRFToken()
    expect(token1).not.toBe(token2)
  })
})

// ─── verifyCSRFToken ──────────────────────────────────────────────────────────

describe('verifyCSRFToken', () => {
  it('returns true when provided token matches stored cookie token', async () => {
    const token = 'a'.repeat(64)
    mockedCookies.mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: token }),
    } as any)

    const result = await verifyCSRFToken(token)
    expect(result).toBe(true)
  })

  it('returns false when tokens do not match', async () => {
    mockedCookies.mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: 'b'.repeat(64) }),
    } as any)

    const result = await verifyCSRFToken('a'.repeat(64))
    expect(result).toBe(false)
  })

  it('returns false when provided token is null', async () => {
    mockedCookies.mockResolvedValue({ get: jest.fn() } as any)
    expect(await verifyCSRFToken(null)).toBe(false)
  })

  it('returns false when provided token is undefined', async () => {
    mockedCookies.mockResolvedValue({ get: jest.fn() } as any)
    expect(await verifyCSRFToken(undefined)).toBe(false)
  })

  it('returns false when no cookie is stored', async () => {
    mockedCookies.mockResolvedValue({
      get: jest.fn().mockReturnValue(undefined),
    } as any)
    expect(await verifyCSRFToken('sometoken')).toBe(false)
  })

  it('returns false for empty string token', async () => {
    mockedCookies.mockResolvedValue({ get: jest.fn() } as any)
    expect(await verifyCSRFToken('')).toBe(false)
  })
})

// ─── validateCSRFMiddleware ───────────────────────────────────────────────────

describe('validateCSRFMiddleware', () => {
  it('returns true for GET requests without checking the token', async () => {
    mockedCookies.mockResolvedValue({ get: jest.fn() } as any)
    const req = new Request('https://example.com/api/data', { method: 'GET' })
    expect(await validateCSRFMiddleware(req)).toBe(true)
  })

  it('returns true for HEAD requests', async () => {
    const req = new Request('https://example.com/', { method: 'HEAD' })
    expect(await validateCSRFMiddleware(req)).toBe(true)
  })

  it('validates POST requests against stored cookie', async () => {
    const token = 'c'.repeat(64)
    mockedCookies.mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: token }),
    } as any)

    const req = new Request('https://example.com/api/products', {
      method: 'POST',
      headers: { 'x-csrf-token': token },
    })

    expect(await validateCSRFMiddleware(req)).toBe(true)
  })

  it('rejects POST requests with mismatched CSRF token', async () => {
    mockedCookies.mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: 'd'.repeat(64) }),
    } as any)

    const req = new Request('https://example.com/api/products', {
      method: 'POST',
      headers: { 'x-csrf-token': 'e'.repeat(64) },
    })

    expect(await validateCSRFMiddleware(req)).toBe(false)
  })

  it('rejects PUT requests without CSRF token header', async () => {
    mockedCookies.mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: 'f'.repeat(64) }),
    } as any)

    const req = new Request('https://example.com/api/products/1', {
      method: 'PUT',
    })

    expect(await validateCSRFMiddleware(req)).toBe(false)
  })

  it('rejects DELETE requests with missing token', async () => {
    mockedCookies.mockResolvedValue({
      get: jest.fn().mockReturnValue(undefined),
    } as any)

    const req = new Request('https://example.com/api/products/1', {
      method: 'DELETE',
      headers: { 'x-csrf-token': 'sometoken' },
    })

    expect(await validateCSRFMiddleware(req)).toBe(false)
  })
})

// ─── createCSRFErrorResponse ──────────────────────────────────────────────────

describe('createCSRFErrorResponse', () => {
  it('returns a 403 Response with CSRF_TOKEN_INVALID code', async () => {
    const response = createCSRFErrorResponse()
    expect(response.status).toBe(403)

    const body = await response.json()
    expect(body.error.code).toBe('CSRF_TOKEN_INVALID')
    expect(body.error.message).toBeTruthy()
    expect(response.headers.get('Content-Type')).toBe('application/json')
  })
})
