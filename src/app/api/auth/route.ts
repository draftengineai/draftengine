import { NextRequest, NextResponse } from 'next/server';
import { signCookie } from '@/lib/auth/signed-cookie';
import { checkAuthRateLimit } from '@/lib/auth/rate-limit';

export async function POST(request: NextRequest) {
  // Rate limit: 5 attempts per minute per IP
  const rateLimited = await checkAuthRateLimit(request);
  if (rateLimited) return rateLimited;

  const { password, role } = await request.json();
  const writerPassword = process.env.DRAFTENGINE_PASSWORD;
  const adminPassword = process.env.DRAFTENGINE_ADMIN_PASSWORD;

  if (!writerPassword) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  // Admin login
  if (role === 'admin') {
    if (!adminPassword) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 403 });
    }
    if (password !== adminPassword) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    const token = await signCookie({ role: 'admin' });
    const response = NextResponse.json({ success: true, role: 'admin' });
    response.cookies.set('draftengine_auth', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return response;
  }

  // Writer login
  if (password !== writerPassword) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = await signCookie({ role: 'writer' });
  const response = NextResponse.json({ success: true, role: 'writer' });
  response.cookies.set('draftengine_auth', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return response;
}
