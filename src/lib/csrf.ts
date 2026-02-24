import crypto from 'crypto'
import { cookies } from 'next/headers'

/**
 * CSRF token generálás és tárolás
 */
export async function generateCSRFToken(): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex')
  const cookieStore = await cookies()

  cookieStore.set('csrf-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600, // 1 óra
    path: '/',
  })

  return token
}

/**
 * CSRF token validálás
 * Az X-CSRF-Token header-t vagy request body-t ellenőrizi
 */
export async function verifyCSRFToken(
  token: string | null | undefined
): Promise<boolean> {
  if (!token) {
    return false
  }

  const cookieStore = await cookies()
  const storedToken = cookieStore.get('csrf-token')?.value

  if (!storedToken) {
    return false
  }

  // Constant-time comparison (timing attack ellen)
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(storedToken)
  )
}

/**
 * Middleware az POST/PUT/DELETE kérésekhez
 * Request.headers-ből veszi az X-CSRF-Token-t
 */
export async function validateCSRFMiddleware(
  request: Request
): Promise<boolean> {
  // Csak POST, PUT, DELETE igényel CSRF token
  if (!['POST', 'PUT', 'DELETE'].includes(request.method)) {
    return true
  }

  const token = request.headers.get('x-csrf-token')

  return verifyCSRFToken(token)
}

/**
 * Hiba válasz CSRF token hiányzásakor
 */
export function createCSRFErrorResponse() {
  return new Response(
    JSON.stringify({
      error: {
        code: 'CSRF_TOKEN_INVALID',
        message: 'CSRF token hiányzik vagy érvénytelen',
      },
    }),
    {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )
}
