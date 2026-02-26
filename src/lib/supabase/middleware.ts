import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // 1. Kiindulási response – KÖTELEZŐ az eredeti request továbbítása
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Először a request cookie-kra írjuk (downstream olvasáshoz)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Majd a response-ra – NEM hozunk létre új NextResponse.next()-et!
          // Ez megőrzi az összes meglévő response headert.
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 2. MINDIG getUser()-t használj, NEM getSession()-t!
  // A getUser() a Supabase Auth szerverén validálja a tokent – biztonságos.
  // A getSession() csak a cookie-ból olvassa ki, nem validál – NEM biztonságos!
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 3. Védett route-ok (/dashboard) – bejelentkezetlen user átirányítása
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    // FONTOS: redirect esetén is másoljuk át a session cookie-kat,
    // hogy ne veszítsük el a frissített tokent!
    const redirectResponse = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  // 4. Bejelentkezett user ne férhessen hozzá a /login oldalhoz
  // – ez véd az infinite redirect loop ellen!
  if (user && request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // 5. Mindig az eredeti supabaseResponse-t add vissza,
  // hogy a session cookie-k ne vesszenek el!
  return supabaseResponse
}