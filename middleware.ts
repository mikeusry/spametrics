import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';

// Routes that don't require authentication
const publicRoutes = ['/login'];

// API routes that don't require authentication
const publicApiRoutes = ['/api/auth/login'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Allow public API routes
  if (publicApiRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow Next.js internal routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/_next') ||
    pathname.includes('favicon.ico') ||
    pathname.includes('.') // Static files
  ) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionCookie = req.cookies.get('session');

  if (!sessionCookie) {
    // No session, redirect to login
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify session token
  const session = await verifySession(sessionCookie.value);

  if (!session || !session.authenticated) {
    // Invalid or expired session, redirect to login
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', pathname);
    const response = NextResponse.redirect(loginUrl);

    // Clear invalid session cookie
    response.cookies.delete('session');

    return response;
  }

  // Valid session, allow request
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
