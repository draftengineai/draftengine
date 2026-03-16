import { NextRequest, NextResponse } from 'next/server';
import { getArticle, updateArticle } from '@/lib/db/storage';
import { removeFacts } from '@/lib/verified-facts/store';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { articleId, reason } = body;

  if (!articleId || !reason) {
    return NextResponse.json(
      { error: 'articleId and reason are required' },
      { status: 400 }
    );
  }

  const article = await getArticle(articleId);
  if (!article) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (article.status !== 'approved' && article.status !== 'shared') {
    return NextResponse.json(
      { error: 'Article must be in approved or shared status' },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  // Remove verified facts from this article
  await removeFacts(article.module, articleId);

  // Update article status
  await updateArticle(articleId, {
    status: 'revision',
    revisionReason: reason,
    revisionRequestedAt: now,
  });

  return NextResponse.json({ success: true });
}
