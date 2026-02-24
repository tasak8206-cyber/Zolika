import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ✅ PROTECTED ROUTES (csak bejelentkezetteknek)
  const protectedRoutes = ['/dashboard', '/products', '/settings']
  
  // ✅ PUBLIC ROUTES (mindenki számára)
  const publicRoutes = ['/login', '/signup', '/']

  // ✅ NE FUSS EZEKEN
  const skipRoutes = [
    '/_next',
    '/api',
    '/favicon.ico',
    '/public',
  ]

  // ✅ KIHAGYÁS - statikus fájlok
  if (skipRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // ✅ OLVASD A SESSIONT (localStorage-ből jön majd)
  const session = request.cookies.get('session')?.value

  // ✅ PROTECTED ROUTE - nincs session?
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!session) {
      // ✅ IRÁNYÍTSD A LOGINRA
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  // ✅ PUBLIC ROUTE - van session?
  if (publicRoutes.includes(pathname)) {
    if (session) {
      // ✅ IRÁNYÍTSD A DASHBOARDRA
      const dashboardUrl = new URL('/dashboard', request.url)
      return NextResponse.redirect(dashboardUrl)
    }
  }

  // ✅ HAGYJ TOVÁBBLÉPNI
  return NextResponse.next()
}

export const config = {
  matcher: [
    // ✅ NE FUSS STATIC ASSETEKEN
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}