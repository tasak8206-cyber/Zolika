// We mock the external Redis/Ratelimit packages (not installed as project deps)
// so the rate-limit utility functions can be tested in isolation.
jest.mock('@upstash/ratelimit', () => {
  const mockLimit = jest.fn()
  class MockRatelimit {
    limit = mockLimit
    static slidingWindow = jest.fn().mockReturnValue({ type: 'slidingWindow' })
    static fromEnv = jest.fn()
  }
  return { Ratelimit: MockRatelimit, __mockLimit: mockLimit }
})

jest.mock('@upstash/redis', () => ({
  Redis: { fromEnv: jest.fn().mockReturnValue({}) },
}))

import { checkRateLimit, enforceRateLimit } from '../ratelimit'
import { RateLimitError } from '../errors'
import { Ratelimit } from '@upstash/ratelimit'

// Helper: build a mock Ratelimit instance whose limit() resolves with given result
function makeLimiter(result: {
  success: boolean
  remaining: number
  limit: number
  reset: number
}) {
  const limiter = new Ratelimit({ redis: {} as any, limiter: {} as any })
  ;(limiter.limit as jest.Mock).mockResolvedValue(result)
  return limiter
}

// ─── checkRateLimit ───────────────────────────────────────────────────────────

describe('checkRateLimit', () => {
  describe('happy paths', () => {
    it('returns success=true and passes through remaining/limit/reset', async () => {
      const now = Date.now()
      const resetAt = now + 60_000
      const limiter = makeLimiter({ success: true, remaining: 4, limit: 5, reset: resetAt })

      const result = await checkRateLimit('user:1', limiter)

      expect(result.success).toBe(true)
      expect(result.remaining).toBe(4)
      expect(result.limit).toBe(5)
      expect(result.reset).toBe(resetAt)
    })

    it('returns success=false when the limit is exceeded', async () => {
      const now = Date.now()
      const limiter = makeLimiter({ success: false, remaining: 0, limit: 5, reset: now + 30_000 })

      const result = await checkRateLimit('user:2', limiter)

      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('calculates a positive retryAfter when reset is in the future', async () => {
      const resetAt = Date.now() + 90_000 // 90 seconds from now
      const limiter = makeLimiter({ success: false, remaining: 0, limit: 5, reset: resetAt })

      const result = await checkRateLimit('user:3', limiter)

      expect(result.retryAfter).toBeDefined()
      expect(result.retryAfter!).toBeGreaterThan(0)
      expect(result.retryAfter!).toBeLessThanOrEqual(90)
    })

    it('returns retryAfter of 0 when reset is now', async () => {
      const resetAt = Date.now()
      const limiter = makeLimiter({ success: false, remaining: 0, limit: 5, reset: resetAt })

      const result = await checkRateLimit('user:4', limiter)

      expect(result.retryAfter).toBeDefined()
      expect(result.retryAfter!).toBeLessThanOrEqual(1)
    })

    it('calls limiter.limit with the provided identifier', async () => {
      const limiter = makeLimiter({ success: true, remaining: 99, limit: 100, reset: Date.now() + 1000 })

      await checkRateLimit('ip:192.168.1.1', limiter)

      expect(limiter.limit).toHaveBeenCalledWith('ip:192.168.1.1')
    })
  })

  describe('edge cases', () => {
    it('handles an empty string identifier without throwing', async () => {
      const limiter = makeLimiter({ success: true, remaining: 1, limit: 5, reset: Date.now() + 1000 })

      await expect(checkRateLimit('', limiter)).resolves.not.toThrow()
    })

    it('handles an extremely long identifier without throwing', async () => {
      const longId = 'user:' + 'x'.repeat(1000)
      const limiter = makeLimiter({ success: true, remaining: 1, limit: 5, reset: Date.now() + 1000 })

      await expect(checkRateLimit(longId, limiter)).resolves.not.toThrow()
    })

    it('forwards limiter errors (e.g., Redis connection failure)', async () => {
      const limiter = new Ratelimit({ redis: {} as any, limiter: {} as any })
      ;(limiter.limit as jest.Mock).mockRejectedValue(new Error('Redis connection failed'))

      await expect(checkRateLimit('user:5', limiter)).rejects.toThrow('Redis connection failed')
    })
  })
})

// ─── enforceRateLimit ─────────────────────────────────────────────────────────

describe('enforceRateLimit', () => {
  describe('happy paths', () => {
    it('returns the rate-limit result when within the limit', async () => {
      const limiter = makeLimiter({ success: true, remaining: 3, limit: 5, reset: Date.now() + 1000 })

      const result = await enforceRateLimit('user:ok', limiter)

      expect(result.success).toBe(true)
      expect(result.remaining).toBe(3)
    })

    it('does not throw when remaining is 0 but success is still true', async () => {
      const limiter = makeLimiter({ success: true, remaining: 0, limit: 1, reset: Date.now() + 500 })

      await expect(enforceRateLimit('user:last', limiter)).resolves.not.toThrow()
    })
  })

  describe('error states', () => {
    it('throws RateLimitError when the limit is exceeded', async () => {
      const resetAt = Date.now() + 60_000
      const limiter = makeLimiter({ success: false, remaining: 0, limit: 5, reset: resetAt })

      await expect(enforceRateLimit('user:exceeded', limiter)).rejects.toThrow(RateLimitError)
    })

    it('thrown RateLimitError has correct statusCode 429', async () => {
      const limiter = makeLimiter({ success: false, remaining: 0, limit: 5, reset: Date.now() + 10_000 })

      try {
        await enforceRateLimit('user:429', limiter)
        fail('Expected RateLimitError to be thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(RateLimitError)
        expect((err as RateLimitError).statusCode).toBe(429)
        expect((err as RateLimitError).code).toBe('RATE_LIMIT_ERROR')
      }
    })

    it('thrown RateLimitError includes retryAfter seconds', async () => {
      const resetAt = Date.now() + 45_000 // 45 seconds
      const limiter = makeLimiter({ success: false, remaining: 0, limit: 5, reset: resetAt })

      try {
        await enforceRateLimit('user:retry', limiter)
      } catch (err) {
        expect((err as RateLimitError).retryAfter).toBeDefined()
        expect((err as RateLimitError).retryAfter!).toBeGreaterThan(0)
      }
    })

    it('error message contains retryAfter seconds for UX feedback', async () => {
      const resetAt = Date.now() + 30_000
      const limiter = makeLimiter({ success: false, remaining: 0, limit: 5, reset: resetAt })

      try {
        await enforceRateLimit('user:msg', limiter)
      } catch (err) {
        expect((err as RateLimitError).message).toMatch(/\d+s/)
      }
    })

    it('propagates underlying Redis errors as-is', async () => {
      const limiter = new Ratelimit({ redis: {} as any, limiter: {} as any })
      ;(limiter.limit as jest.Mock).mockRejectedValue(new Error('Network timeout'))

      await expect(enforceRateLimit('user:neterr', limiter)).rejects.toThrow('Network timeout')
    })
  })
})

// ─── validateEnv (indirectly tested via getLoginRateLimiter) ─────────────────

describe('getLoginRateLimiter', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    jest.resetModules()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('throws when UPSTASH_REDIS_REST_URL is missing', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN

    const { getLoginRateLimiter } = await import('../ratelimit')
    expect(() => getLoginRateLimiter()).toThrow('UPSTASH_REDIS_REST_URL')
  })

  it('throws when UPSTASH_REDIS_REST_TOKEN is missing', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io'
    delete process.env.UPSTASH_REDIS_REST_TOKEN

    const { getLoginRateLimiter } = await import('../ratelimit')
    expect(() => getLoginRateLimiter()).toThrow('UPSTASH_REDIS_REST_TOKEN')
  })

  it('returns the same limiter instance on repeated calls (singleton)', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token123'

    const { getLoginRateLimiter } = await import('../ratelimit')
    const limiter1 = getLoginRateLimiter()
    const limiter2 = getLoginRateLimiter()
    expect(limiter1).toBe(limiter2)
  })
})
