import { Article } from '@/lib/types/article';

/**
 * Storage abstraction. Uses Vercel KV in production (when KV env vars are set),
 * falls back to local store.json in dev.
 */

const ARTICLES_KEY = 'articles';

function useKV(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function requireKVInProduction(): void {
  if (process.env.VERCEL && !useKV()) {
    throw new Error(
      'Vercel KV is not configured. Link a KV store in the Vercel dashboard, or set KV_REST_API_URL and KV_REST_API_TOKEN environment variables.'
    );
  }
}

// --------------- KV helpers ---------------

async function kvGet(): Promise<Article[]> {
  const { kv } = await import('@vercel/kv');
  const data = await kv.get<Article[]>(ARTICLES_KEY);
  return data ?? [];
}

async function kvSet(articles: Article[]): Promise<void> {
  const { kv } = await import('@vercel/kv');
  await kv.set(ARTICLES_KEY, articles);
}

// --------------- File helpers ---------------

async function fileGet(): Promise<Article[]> {
  const { readFileSync, writeFileSync, existsSync } = await import('fs');
  const { join } = await import('path');
  const STORE_PATH = join(process.cwd(), 'src/lib/db/store.json');
  if (!existsSync(STORE_PATH)) {
    writeFileSync(STORE_PATH, '[]', 'utf-8');
    return [];
  }
  const raw = readFileSync(STORE_PATH, 'utf-8');
  return JSON.parse(raw) as Article[];
}

async function fileSet(articles: Article[]): Promise<void> {
  const { writeFileSync } = await import('fs');
  const { join } = await import('path');
  const STORE_PATH = join(process.cwd(), 'src/lib/db/store.json');
  writeFileSync(STORE_PATH, JSON.stringify(articles, null, 2), 'utf-8');
}

// --------------- Public API ---------------

export async function getArticles(): Promise<Article[]> {
  return useKV() ? kvGet() : fileGet();
}

export async function getArticle(id: string): Promise<Article | undefined> {
  const articles = await getArticles();
  return articles.find(a => a.id === id);
}

export async function saveArticle(article: Article): Promise<Article> {
  requireKVInProduction();
  const articles = await getArticles();
  articles.unshift(article);
  if (useKV()) {
    await kvSet(articles);
  } else {
    await fileSet(articles);
  }
  return article;
}

export async function updateArticle(id: string, updates: Partial<Article>): Promise<Article | undefined> {
  requireKVInProduction();
  const articles = await getArticles();
  const index = articles.findIndex(a => a.id === id);
  if (index === -1) return undefined;
  articles[index] = { ...articles[index], ...updates, updatedAt: new Date().toISOString() };
  if (useKV()) {
    await kvSet(articles);
  } else {
    await fileSet(articles);
  }
  return articles[index];
}

export async function deleteArticle(id: string): Promise<boolean> {
  requireKVInProduction();
  const articles = await getArticles();
  const index = articles.findIndex(a => a.id === id);
  if (index === -1) return false;
  articles.splice(index, 1);
  if (useKV()) {
    await kvSet(articles);
  } else {
    await fileSet(articles);
  }
  return true;
}
