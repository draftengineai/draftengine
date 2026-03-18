import type { VerifiedFacts } from './extractor';

/**
 * Build a VERIFIED FACTS prompt block from previously approved articles.
 * Merges facts from all StoredFacts entries into a single deduplicated block.
 * Returns an empty string if no facts are available.
 */
export function buildVerifiedFactsBlock(
  allFacts: { facts: VerifiedFacts }[]
): string {
  if (allFacts.length === 0) return '';

  let navPath: string | null = null;
  const cards = new Set<string>();
  const buttons = new Set<string>();
  const filters = new Set<string>();
  const uiElements = new Set<string>();

  for (const entry of allFacts) {
    const f = entry.facts;
    if (f.navPath && !navPath) navPath = f.navPath;
    f.cards.forEach(c => cards.add(c));
    f.buttons.forEach(b => buttons.add(b));
    f.filters.forEach(fl => filters.add(fl));
    f.uiElements.forEach(u => uiElements.add(u));
  }

  if (!navPath && cards.size === 0 && buttons.size === 0 && filters.size === 0 && uiElements.size === 0) {
    return '';
  }

  const lines: string[] = [
    '## VERIFIED FACTS (confirmed by human review of previous articles for this module)',
    '',
  ];

  if (navPath) lines.push(`Navigation: In the sidebar, select ${navPath}`);
  if (cards.size > 0) lines.push(`Cards: ${[...cards].join(', ')}`);
  if (buttons.size > 0) lines.push(`Buttons: ${[...buttons].join(', ')}`);
  if (filters.size > 0) lines.push(`Filters: ${[...filters].join(', ')}`);
  if (uiElements.size > 0) lines.push(`UI Elements: ${[...uiElements].join(', ')}`);

  lines.push('');
  lines.push('These facts have been verified by a human reviewer. Do NOT flag steps that use only these verified elements. Only flag steps that reference elements NOT listed above.');

  return lines.join('\n');
}
