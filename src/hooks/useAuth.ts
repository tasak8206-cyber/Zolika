'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

/**
 * useAuth Hook
 * Bejelentkezési állapot kezelése és auth műveletek
 */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Stable reference – prevents multiple GoTrueClient instances
  const supabaseRef = useRef(createClient())

  // Session frissítés
  useEffect(() => {
    const client = supabaseRef.current

    const fetchSession = async () => {
      try {
        const { data: { session } } = await client.auth.getSession()
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
    } = client.auth.onAuthStateChange((event, session) => {
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
        const { data, error: signInError } = await supabaseRef.current.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) {
          throw new Error(signInError.message)
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
      const { error: signOutError } = await supabaseRef.current.auth.signOut()

      if (signOutError) {
        throw new Error(signOutError.message)
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
