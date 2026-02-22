import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const isAuthenticated = !!request.cookies.get('auth_token'); // Example of checking authentication
    const { pathname } = request.nextUrl;

    if (!isAuthenticated && pathname === '/dashboard') {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard'],
};