import { NextRequest, NextResponse } from 'next/server';
import { getFacts } from '@/lib/verified-facts/store';

export async function GET(request: NextRequest) {
  const module = request.nextUrl.searchParams.get('module');
  if (!module) {
    return NextResponse.json(
      { error: 'module query parameter is required' },
      { status: 400 }
    );
  }

  const facts = await getFacts(module);
  return NextResponse.json(facts);
}
