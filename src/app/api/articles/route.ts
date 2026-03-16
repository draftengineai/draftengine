import { NextRequest, NextResponse } from 'next/server';
import { getAllArticles, createArticle } from '@/lib/db/articles';
import { Article } from '@/lib/types/article';

export async function GET() {
  const articles = getAllArticles();
  return NextResponse.json(articles);
}

export async function POST(request: NextRequest) {
  const article: Article = await request.json();
  const saved = createArticle(article);
  return NextResponse.json(saved, { status: 201 });
}
