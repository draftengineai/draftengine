import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { Article } from '@/lib/types/article';

const STORE_PATH = join(process.cwd(), 'src/lib/db/store.json');

function readStore(): Article[] {
  if (!existsSync(STORE_PATH)) {
    writeFileSync(STORE_PATH, '[]', 'utf-8');
    return [];
  }
  const raw = readFileSync(STORE_PATH, 'utf-8');
  return JSON.parse(raw) as Article[];
}

function writeStore(articles: Article[]): void {
  writeFileSync(STORE_PATH, JSON.stringify(articles, null, 2), 'utf-8');
}

export function getAllArticles(): Article[] {
  return readStore();
}

export function getArticleById(id: string): Article | undefined {
  return readStore().find(a => a.id === id);
}

export function createArticle(article: Article): Article {
  const articles = readStore();
  articles.unshift(article);
  writeStore(articles);
  return article;
}

export function updateArticle(id: string, updates: Partial<Article>): Article | undefined {
  const articles = readStore();
  const index = articles.findIndex(a => a.id === id);
  if (index === -1) return undefined;
  articles[index] = { ...articles[index], ...updates, updatedAt: new Date().toISOString() };
  writeStore(articles);
  return articles[index];
}

export function deleteArticle(id: string): boolean {
  const articles = readStore();
  const index = articles.findIndex(a => a.id === id);
  if (index === -1) return false;
  articles.splice(index, 1);
  writeStore(articles);
  return true;
}
