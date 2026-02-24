'use client'

import { useCallback, useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/client'

/**
 * useAuth Hook
 * Bejelentkezési állapot kezelése és auth műveletek
 */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  // Session frissítés
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setError(null)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Session fetch failed'
        setError(message)
        setSession(null)
      } finally {
        setLoading(false)
      }
    }

    fetchSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setLoading(false)

      if (event === 'SIGNED_OUT') {
        setError(null)
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  // Bejelentkezés
  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true)
      setError(null)

      try {
        // CSRF token lekérése
        const csrfResponse = await fetch('/api/auth/login', {
          method: 'GET',
        })
        const { data: csrfData } = await csrfResponse.json()

        // Bejelentkezés
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfData.csrfToken,
          },
          body: JSON.stringify({ email, password }),
        })

        const { data, error: apiError } = await response.json()

        if (!response.ok || apiError) {
          throw new Error(apiError?.message || 'Login failed')
        }

        setSession(data?.session || null)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Login failed'
        setError(message)
        return false
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Kijelentkezés
  const logout = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // CSRF token lekérése
      const csrfResponse = await fetch('/api/auth/login', {
        method: 'GET',
      })
      const { data: csrfData } = await csrfResponse.json()

      // Kijelentkezés
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': csrfData.csrfToken,
        },
      })

      if (!response.ok) {
        throw new Error('Logout failed')
      }

      setSession(null)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed'
      setError(message)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    session,
    loading,
    error,
    login,
    logout,
    user: session?.user || null,
  }
}
