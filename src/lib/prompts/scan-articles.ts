/**
 * scan-articles.ts — Article Impact Scanner
 * Version: v0.1.0
 * Purpose: Given a change description, scan a library of existing articles
 *          and return which ones are potentially affected, with confidence levels.
 *
 * v0.1.0 — Initial version. Matches on module, bold UI element overlap, and semantic similarity.
 */

export const SCAN_ARTICLES_PROMPT_VERSION = 'v0.1.0';

export function buildScanPrompt(params: {
  changeTitle: string;
  changeDescription: string;
  module: string;
  changeType: string;
  articles: Array<{
    id: string;
    title: string;
    module: string;
    overview: string;
    boldElements: string[]; // UI element names extracted from bold tags in the article
    types: string[];
  }>;
}): string {
  const { changeTitle, changeDescription, module, changeType, articles } = params;

  const articleList = articles.map((a, i) => 
    `ARTICLE ${i + 1}:
  id: "${a.id}"
  title: "${a.title}"
  module: "${a.module}"
  types: [${a.types.join(', ')}]
  overview: "${a.overview}"
  UI elements referenced: [${a.boldElements.join(', ')}]`
  ).join('\n\n');

  return `You are an article impact analyzer for the Gate Access Knowledge Center.

## YOUR TASK

A change has been made to Gate Access. You must determine which existing Knowledge Center articles are potentially affected by this change and need revision.

## THE CHANGE

Title: ${changeTitle}
Type: ${changeType}
Module: ${module}
Description:
${changeDescription}

## EXISTING ARTICLES

${articleList}

## CONFIDENCE RULES

Assign each article one of three confidence levels:

**HIGH** — The article is almost certainly affected. Assign HIGH when:
- The article is in the SAME MODULE as the change AND references UI elements that the change description mentions or modifies
- The change explicitly names a feature, button, card, or screen that appears in the article's bold elements list
- Example: Change says "Reset button renamed to Clear" and the article's bold elements include "Reset"

**MEDIUM** — The article may be affected. Assign MEDIUM when:
- The article is in the same module but doesn't directly reference the changed UI elements
- The article is in a RELATED module that displays data from the changed module
- The change modifies search behavior and the article involves search in any module
- Example: Change is to Residents search, and the article is about Facility Contacts which display resident data

**LOW** — The article is unlikely to be affected but shares enough context to mention. Assign LOW when:
- The article is in the same module but covers a completely different feature
- The connection is indirect and the writer should decide
- Example: Change is to Applicants search, and the article is about logging in (same Settings module but unrelated feature)

**DO NOT INCLUDE** articles with no plausible connection to the change. Only return articles with at least a LOW confidence match.

## REASONING

For each affected article, provide a one-sentence reason explaining WHY you think it's affected. Be specific — reference the UI element, module overlap, or functional connection. Do not use generic phrases like "may be related."

Good reason: "This article references the Reset button in Steps 5 and 7, which was renamed to Clear."
Bad reason: "This article is in the same module and may be affected."

## OUTPUT FORMAT

Return ONLY a JSON array. No preamble, no markdown fences, no explanation outside the JSON.

[
  {
    "articleId": "the article's id",
    "title": "the article's title",
    "module": "the article's module",
    "types": ["howto"],
    "confidence": "high",
    "reason": "One specific sentence explaining why this article is affected."
  }
]

If no articles are affected, return an empty array: []

Sort results by confidence: high first, then medium, then low.`;
}
