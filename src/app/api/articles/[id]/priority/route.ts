import { NextRequest, NextResponse } from 'next/server';
import { updateArticle } from '@/lib/db/storage';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { priority } = await request.json();

  if (typeof priority !== 'number') {
    return NextResponse.json({ error: 'priority must be a number' }, { status: 400 });
  }

  const updated = await updateArticle(id, { priority });
  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(updated);
}
