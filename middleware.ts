import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Client-side Firebase Auth doesn't work in middleware (edge runtime).
// This middleware sets up basic route protection via cookie check.
// The actual auth verification happens in each page component via useAuth().

const protectedRoutes = ['/ogrenci', '/veli'];
const publicRoutes = ['/auth', '/'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow API routes and static files
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  // Check for auth session cookie (set by Firebase client SDK)
  const hasSession = request.cookies.has('__session') || request.cookies.has('firebaseToken');

  // If accessing protected route without session, redirect to auth
  const isProtected = protectedRoutes.some(route => pathname.startsWith(route));
  if (isProtected && !hasSession) {
    // Don't force redirect — let client-side auth handle it
    // This is a soft guard; the real guard is useAuth() in each page
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
