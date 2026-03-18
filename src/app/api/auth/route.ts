import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { password, role } = await request.json();
  const writerPassword = process.env.DRAFTENGINE_PASSWORD;
  const adminPassword = process.env.DRAFTENGINE_ADMIN_PASSWORD;

  if (!writerPassword) {
    return NextResponse.json({ error: 'DRAFTENGINE_PASSWORD not configured' }, { status: 500 });
  }

  // Admin login
  if (role === 'admin') {
    if (!adminPassword) {
      return NextResponse.json({ error: 'Admin access not configured' }, { status: 403 });
    }
    if (password !== adminPassword) {
      return NextResponse.json({ error: 'Invalid admin password' }, { status: 401 });
    }
    const response = NextResponse.json({ success: true, role: 'admin' });
    response.cookies.set('draftengine_auth', JSON.stringify({ role: 'admin' }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return response;
  }

  // Writer login
  if (password !== writerPassword) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true, role: 'writer' });
  response.cookies.set('draftengine_auth', JSON.stringify({ role: 'writer' }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return response;
}
