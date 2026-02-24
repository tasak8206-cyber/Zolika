import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { RateLimitError } from './errors'

// Validálás hogy vannak-e a szükséges environment variables
function validateEnv() {
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    throw new Error('UPSTASH_REDIS_REST_URL environment variable is missing')
  }
  if (!process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error('UPSTASH_REDIS_REST_TOKEN environment variable is missing')
  }
}

// Rate limiter instancia
let rateLimiters: Record<string, Ratelimit> = {}

/**
 * Login rate limiter - 5 próbálkozás / 15 perc
 */
export function getLoginRateLimiter() {
  validateEnv()

  if (!rateLimiters.login) {
    rateLimiters.login = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, '15 m'),
      analytics: true,
    })
  }

  return rateLimiters.login
}

/**
 * API rate limiter - 100 kérés / 15 perc
 */
export function getApiRateLimiter() {
  validateEnv()

  if (!rateLimiters.api) {
    rateLimiters.api = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(100, '15 m'),
      analytics: true,
    })
  }

  return rateLimiters.api
}

/**
 * Sign up rate limiter - 3 regisztráció / 1 óra
 */
export function getSignUpRateLimiter() {
  validateEnv()

  if (!rateLimiters.signup) {
    rateLimiters.signup = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(3, '1 h'),
      analytics: true,
    })
  }

  return rateLimiters.signup
}

/**
 * Middleware rate limiting check
 */
export async function checkRateLimit(
  identifier: string,
  limiter: Ratelimit
): Promise<{
  success: boolean
  remaining: number
  limit: number
  reset: number
  retryAfter?: number
}> {
  const result = await limiter.limit(identifier)

  return {
    success: result.success,
    remaining: result.remaining,
    limit: result.limit,
    reset: result.reset,
    retryAfter: result.reset
      ? Math.ceil((result.reset - Date.now()) / 1000)
      : undefined,
  }
}

/**
 * Validate rate limit és dobj hibát ha megsértett
 */
export async function enforceRateLimit(
  identifier: string,
  limiter: Ratelimit
) {
  const result = await checkRateLimit(identifier, limiter)

  if (!result.success) {
    throw new RateLimitError(
      `Túl sok kérés. Kérem próbálja később (${result.retryAfter}s).`,
      result.retryAfter
    )
  }

  return result
}
