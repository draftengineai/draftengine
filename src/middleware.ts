import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/api/auth'];

function parseAuthCookie(value: string | undefined): { role: string } | null {
  if (!value) return null;
  // Support both new JSON format and legacy "authenticated" string
  if (value === 'authenticated') return { role: 'writer' };
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed.role === 'string') return parsed;
  } catch {
    // Not JSON — treat as legacy authenticated
    return { role: 'writer' };
  }
  return null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow preview routes (shareable with Stewards)
  if (pathname.startsWith('/preview/')) {
    return NextResponse.next();
  }

  // Allow static assets and Next.js internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  // Check auth cookie
  const authCookie = request.cookies.get('gatedoc_auth');
  const auth = parseAuthCookie(authCookie?.value);

  if (!auth) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Admin routes require admin role
  if (pathname.startsWith('/admin')) {
    if (auth.role !== 'admin') {
      const landingUrl = new URL('/', request.url);
      return NextResponse.redirect(landingUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
