import type { VerifiedFacts } from './extractor';

/**
 * A stored facts entry tagged with source article ID for traceability.
 */
export interface StoredFacts {
  articleId: string;
  facts: VerifiedFacts;
  storedAt: string;
}

/**
 * Module-level facts collection: an array of StoredFacts entries,
 * one per approved article for that module.
 */
export type ModuleFacts = StoredFacts[];

const FACTS_PREFIX = 'verified-facts:';

function useKV(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

// --------------- KV helpers ---------------

async function kvGet(key: string): Promise<ModuleFacts> {
  const { kv } = await import('@vercel/kv');
  const data = await kv.get<ModuleFacts>(key);
  return data ?? [];
}

async function kvSet(key: string, data: ModuleFacts): Promise<void> {
  const { kv } = await import('@vercel/kv');
  await kv.set(key, data);
}

// --------------- File helpers ---------------

const STORE_FILENAME = 'verified-facts-store.json';

async function getStorePath(): Promise<string> {
  const { join } = await import('path');
  return join(process.cwd(), 'src/lib/db', STORE_FILENAME);
}

async function fileGetAll(): Promise<Record<string, ModuleFacts>> {
  const { readFileSync, existsSync } = await import('fs');
  const storePath = await getStorePath();
  if (!existsSync(storePath)) return {};
  const raw = readFileSync(storePath, 'utf-8');
  return JSON.parse(raw);
}

async function fileSetAll(data: Record<string, ModuleFacts>): Promise<void> {
  const { writeFileSync } = await import('fs');
  const storePath = await getStorePath();
  writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf-8');
}

async function fileGet(key: string): Promise<ModuleFacts> {
  const all = await fileGetAll();
  return all[key] ?? [];
}

async function fileSet(key: string, data: ModuleFacts): Promise<void> {
  const all = await fileGetAll();
  all[key] = data;
  await fileSetAll(all);
}

// --------------- Public API ---------------

/**
 * Save verified facts for a module, tagged with the source article ID.
 * Merges with existing facts (accumulates, doesn't overwrite).
 * If facts from the same articleId already exist, they are replaced.
 */
export async function saveFacts(
  module: string,
  facts: VerifiedFacts,
  articleId: string
): Promise<number> {
  const key = `${FACTS_PREFIX}${module}`;
  const existing = useKV() ? await kvGet(key) : await fileGet(key);

  // Remove any previous entry from this article (in case of re-approval)
  const filtered = existing.filter((e) => e.articleId !== articleId);

  const entry: StoredFacts = {
    articleId,
    facts,
    storedAt: new Date().toISOString(),
  };

  filtered.push(entry);

  if (useKV()) {
    await kvSet(key, filtered);
  } else {
    await fileSet(key, filtered);
  }

  // Count of facts stored for this entry
  return (
    facts.uiElements.length +
    facts.buttons.length +
    facts.filters.length +
    facts.cards.length +
    (facts.navPath ? 1 : 0)
  );
}

/**
 * Remove verified facts that came from a specific article.
 */
export async function removeFacts(
  module: string,
  articleId: string
): Promise<void> {
  const key = `${FACTS_PREFIX}${module}`;
  const existing = useKV() ? await kvGet(key) : await fileGet(key);
  const filtered = existing.filter((e) => e.articleId !== articleId);

  if (useKV()) {
    await kvSet(key, filtered);
  } else {
    await fileSet(key, filtered);
  }
}

/**
 * Get merged verified facts for a module (from all approved articles).
 */
export async function getFacts(module: string): Promise<ModuleFacts> {
  const key = `${FACTS_PREFIX}${module}`;
  return useKV() ? kvGet(key) : fileGet(key);
}
