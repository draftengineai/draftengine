import { NextRequest, NextResponse } from 'next/server';
import { getArticles, saveArticle } from '@/lib/db/storage';
import { Article } from '@/lib/types/article';

export async function GET() {
  const articles = await getArticles();
  return NextResponse.json(articles);
}

const MAX_TITLE_LENGTH = 500;
const MAX_BODY_LENGTH = 100_000;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const article = body as Record<string, unknown>;

  // Required fields
  if (!article.id || typeof article.id !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid id' }, { status: 400 });
  }
  if (!article.title || typeof article.title !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid title' }, { status: 400 });
  }
  if (!article.module || typeof article.module !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid module' }, { status: 400 });
  }

  // Length limits
  if (article.title.length > MAX_TITLE_LENGTH) {
    return NextResponse.json({ error: 'Title too long' }, { status: 400 });
  }
  const bodyStr = JSON.stringify(article);
  if (bodyStr.length > MAX_BODY_LENGTH) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 400 });
  }

  const saved = await saveArticle(article as unknown as Article);
  return NextResponse.json(saved, { status: 201 });
}
