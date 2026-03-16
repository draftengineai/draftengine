import { NextRequest, NextResponse } from 'next/server';
import { getArticles, saveArticle } from '@/lib/db/storage';
import { Article } from '@/lib/types/article';

export async function GET() {
  const articles = await getArticles();
  return NextResponse.json(articles);
}

export async function POST(request: NextRequest) {
  const article: Article = await request.json();
  const saved = await saveArticle(article);
  return NextResponse.json(saved, { status: 201 });
}
