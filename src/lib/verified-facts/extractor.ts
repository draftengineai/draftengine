import type { Article } from '@/lib/types/article';

export interface VerifiedFacts {
  module: string;
  navPath: string | null;
  cards: string[];
  buttons: string[];
  filters: string[];
  uiElements: string[];
}

/**
 * Extract verified facts from an approved article's content.
 * Parses bold elements, navigation paths, and UI component names
 * from the How To steps.
 */
export function extractFacts(article: Article): VerifiedFacts {
  const facts: VerifiedFacts = {
    module: article.module,
    navPath: null,
    cards: [],
    buttons: [],
    filters: [],
    uiElements: [],
  };

  const howto = article.content.howto;
  if (!howto) return facts;

  // Extract navigation path from Step 1
  if (howto.steps.length > 0) {
    const step1Text = howto.steps[0].text;
    // Match "navigate to <b>X</b>" or "sidebar, select <b>X</b>"
    const navMatch = step1Text.match(/navigate to (?:the )?<b>(.+?)<\/b>/i)
      || step1Text.match(/sidebar,?\s+select\s+<b>(.+?)<\/b>/i);
    if (navMatch) {
      facts.navPath = navMatch[1];
    }
  }

  // Parse all bold elements from all steps
  const boldPattern = /<b>(.+?)<\/b>/gi;
  const allBoldElements: string[] = [];

  for (const step of howto.steps) {
    let match: RegExpExecArray | null;
    while ((match = boldPattern.exec(step.text)) !== null) {
      const element = match[1].trim();
      if (element && !allBoldElements.includes(element)) {
        allBoldElements.push(element);
      }
    }
  }

  // Categorize bold elements
  const buttonKeywords = ['button', 'click', 'press', 'submit', 'save', 'apply', 'reset', 'clear', 'cancel', 'ok', 'confirm', 'delete', 'remove'];
  const filterKeywords = ['filter', 'dropdown', 'criteria', 'search', 'sort', 'availability', 'status'];
  const cardKeywords = ['panel', 'card', 'drawer', 'dialog', 'modal', 'window', 'screen', 'page', 'tab'];

  for (const element of allBoldElements) {
    const lower = element.toLowerCase();

    // Check if it's a button (appears in context like "Click <b>Apply</b>")
    const isButton = buttonKeywords.some(kw => lower.includes(kw)) ||
      howto.steps.some(s => s.text.toLowerCase().includes(`click <b>${element.toLowerCase()}</b>`) ||
        s.text.toLowerCase().includes(`click the <b>${element.toLowerCase()}</b>`));

    // Check if it's a filter
    const isFilter = filterKeywords.some(kw => lower.includes(kw));

    // Check if it's a card/panel/dialog
    const isCard = cardKeywords.some(kw => lower.includes(kw));

    if (isButton) {
      if (!facts.buttons.includes(element)) facts.buttons.push(element);
    }
    if (isFilter) {
      if (!facts.filters.includes(element)) facts.filters.push(element);
    }
    if (isCard) {
      if (!facts.cards.includes(element)) facts.cards.push(element);
    }

    // All bold elements are UI elements
    if (!facts.uiElements.includes(element)) {
      facts.uiElements.push(element);
    }
  }

  return facts;
}
