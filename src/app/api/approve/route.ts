import { NextRequest, NextResponse } from 'next/server';
import { getArticle, updateArticle } from '@/lib/db/storage';
import { extractFacts } from '@/lib/verified-facts/extractor';
import { saveFacts } from '@/lib/verified-facts/store';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { articleId } = body;

  if (!articleId) {
    return NextResponse.json(
      { error: 'articleId is required' },
      { status: 400 }
    );
  }

  const article = await getArticle(articleId);
  if (!article) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const now = new Date().toISOString();

  // Update article status
  await updateArticle(articleId, {
    status: 'approved',
    approvedAt: now,
  });

  // Extract and store verified facts
  const facts = extractFacts(article);
  const factsExtracted = await saveFacts(article.module, facts, articleId);

  return NextResponse.json({ success: true, factsExtracted });
}
