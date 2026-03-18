/**
 * Default Template — Terminology
 *
 * Re-exports the terminology seed JSON as the default template terminology.
 * Organizations can override this with their own terminology in custom templates.
 */

import terminologySeed from '@/lib/config/terminology-seed.json';

export const terminology = terminologySeed;

export type Terminology = typeof terminology;
