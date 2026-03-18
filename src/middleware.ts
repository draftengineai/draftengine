import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_PATHS = ['/login', '/api/auth']
const EXACT_PUBLIC_PATHS = ['/'];

function getSecret(): Uint8Array {
  const secret = process.env.DRAFTENGINE_SECRET;
  if (!secret) {
    // In development/test, allow a fallback to avoid breaking dev workflow
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DRAFTENGINE_SECRET environment variable is required in production');
    }
    return new TextEncoder().encode('dev-secret-not-for-production');
  }
  return new TextEncoder().encode(secret);
}

async function verifyAuthCookie(value: string | undefined): Promise<{ role: string } | null> {
  if (!value) return null;

  try {
    const { payload } = await jwtVerify(value, getSecret());
    if (typeof payload.role === 'string') {
      return { role: payload.role };
    }
  } catch {
    // Invalid or expired token
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow exact public paths (e.g. public landing page at /)
  if (EXACT_PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Allow preview routes (shareable with Reviewers)
  if (pathname.startsWith('/preview/')) {
    return NextResponse.next();
  }

  // Allow static assets and Next.js internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  // Verify signed auth cookie
  const authCookie = request.cookies.get('draftengine_auth');
  const auth = await verifyAuthCookie(authCookie?.value);

  if (!auth) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Admin routes require admin role
  if (pathname.startsWith('/admin')) {
    if (auth.role !== 'admin') {
      const landingUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(landingUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
