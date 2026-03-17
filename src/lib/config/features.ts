/**
 * Feature flags system. Stored in Vercel KV (key: "gatedoc:features")
 * with local JSON fallback for dev.
 *
 * Types, defaults, and constants are defined in feature-flags.ts (client-safe).
 * This file adds the server-side storage layer (fs/KV).
 */

// Re-export everything from the client-safe constants file
export {
  type FeatureFlags,
  DEFAULT_FLAGS,
  FLAG_DESCRIPTIONS,
  CORE_TOOLS_FLAGS,
  REVIEW_WORKFLOW_FLAGS,
} from './feature-flags';

import type { FeatureFlags } from './feature-flags';
import { DEFAULT_FLAGS } from './feature-flags';

const FEATURES_KEY = 'gatedoc:features';

function useKV(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

// --------------- KV helpers ---------------

async function kvGet(): Promise<FeatureFlags> {
  const { kv } = await import('@vercel/kv');
  const data = await kv.get<FeatureFlags>(FEATURES_KEY);
  return data ?? { ...DEFAULT_FLAGS };
}

async function kvSet(flags: FeatureFlags): Promise<void> {
  const { kv } = await import('@vercel/kv');
  await kv.set(FEATURES_KEY, flags);
}

// --------------- File helpers ---------------

async function fileGet(): Promise<FeatureFlags> {
  const { readFileSync, existsSync } = await import('fs');
  const { join } = await import('path');
  const storePath = join(process.cwd(), 'src/lib/db/features-store.json');
  if (!existsSync(storePath)) {
    return { ...DEFAULT_FLAGS };
  }
  const raw = readFileSync(storePath, 'utf-8');
  return JSON.parse(raw) as FeatureFlags;
}

async function fileSet(flags: FeatureFlags): Promise<void> {
  const { writeFileSync } = await import('fs');
  const { join } = await import('path');
  const storePath = join(process.cwd(), 'src/lib/db/features-store.json');
  writeFileSync(storePath, JSON.stringify(flags, null, 2), 'utf-8');
}

// --------------- Public API ---------------

export async function getFeatures(): Promise<FeatureFlags> {
  return useKV() ? kvGet() : fileGet();
}

export async function setFeatures(flags: FeatureFlags): Promise<void> {
  if (useKV()) {
    await kvSet(flags);
  } else {
    await fileSet(flags);
  }
}
