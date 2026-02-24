import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Frissítsd a session-t ha szükséges
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  // Session timeout ellenőrzés
  if (session?.expires_at) {
    const expiresAt = new Date(session.expires_at * 1000)
    if (expiresAt < new Date()) {
      // Session lejárt, próbálj meg frissíteni
      const { data: refreshed, error: refreshError } =
        await supabase.auth.refreshSession()

      if (refreshError || !refreshed?.session) {
        // Refresh nem sikerült, session null
        return { response, session: null }
      }

      return { response, session: refreshed.session }
    }
  }

  return { response, session }
}
