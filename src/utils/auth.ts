import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { logger } from '@/lib/logger'

/**
 * Lekérdezi az aktuális session-t
 * Server Components-ben használd
 */
export async function getSession() {
  try {
    const supabase = await createClient()
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      logger.error('getSession', 'Session fetch error', error)
      return null
    }

    if (!session) {
      return null
    }

    // Session timeout ellenőrzés
    if (session.expires_at) {
      const expiresAt = new Date(session.expires_at * 1000)
      if (expiresAt < new Date()) {
        logger.warn('getSession', 'Session expired')
        return null
      }
    }

    return session
  } catch (error) {
    logger.error('getSession', 'Unexpected error', error)
    return null
  }
}

/**
 * Lekérdezi a session-t vagy redirects a login-re
 * Server Components-ben használd
 */
export async function getSessionOrRedirect() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  return session
}

/**
 * Bejelentkezik egy felhasználót email/jelszóval
 * Validáció a szerver oldalon
 */
export async function signInWithPassword(
  email: string,
  password: string
) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { data: null, error: message }
  }
}

/**
 * Kijelentkezik az aktuális felhasználót
 */
export async function signOut() {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      return { error: error.message }
    }

    return { error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { error: message }
  }
}

/**
 * Felhasználó regisztrálása email/jelszóval
 */
export async function signUp(
  email: string,
  password: string,
  options?: {
    data?: Record<string, unknown>
  }
) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options,
    })

    if (error) {
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { data: null, error: message }
  }
}
