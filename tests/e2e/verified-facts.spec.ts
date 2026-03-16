import { test, expect } from '@playwright/test';
import { login } from './helpers';
import { mockSharedArticle } from '../fixtures/mock-article';
import { extractFacts } from '../../src/lib/verified-facts/extractor';
import { buildVerifiedFactsBlock } from '../../src/lib/verified-facts/block-builder';
import { buildHowToPrompt } from '../../src/lib/prompts/how-to';
import type { Article } from '../../src/lib/types/article';

// ---------------------------------------------------------------------------
// Helper: build a minimal article with given steps for extractor tests
// ---------------------------------------------------------------------------

function makeArticleWithSteps(
  steps: { heading: string; text: string; imgDesc: string; imgPath: string | null }[]
): Article {
  return {
    ...mockSharedArticle,
    id: 'extractor-test',
    module: 'Applicants',
    content: {
      howto: {
        overview: 'Test article overview.',
        steps,
      },
    },
    screenshots: { howto: steps.map(() => false), wn: [] },
    confidence: { howto: steps.map(() => null), wn: [] },
  } as Article;
}

// ---------------------------------------------------------------------------
// Helper: shared article for approve / generate flow tests
// ---------------------------------------------------------------------------

function makeApproveableArticle(id: string) {
  return {
    ...mockSharedArticle,
    id,
    module: 'Applicants',
    status: 'shared' as const,
    content: {
      howto: {
        overview: 'How to search for applicants in the Applicants module.',
        steps: [
          {
            heading: 'Step 1 of 3:',
            text: '<p>After logging in to Gate Access, in the Navigation Panel, select <b>Applicants</b>.</p>',
            imgDesc: 'Nav panel',
            imgPath: null,
          },
          {
            heading: 'Step 2 of 3:',
            text: '<p>Click the <b>Search</b> button to open the <b>Search Criteria</b> panel.</p>',
            imgDesc: 'Search button',
            imgPath: null,
          },
          {
            heading: 'Step 3 of 3:',
            text: '<p>Select a <b>Status Filter</b> and click <b>Apply</b>.</p>',
            imgDesc: 'Filter and apply',
            imgPath: null,
          },
        ],
      },
    },
    screenshots: { howto: [false, false, false], wn: [] },
    confidence: { howto: [null, null, null], wn: [] },
  };
}

// =========================================================================
// TESTS — Extractor (pure unit tests, no server needed)
// =========================================================================

test.describe('Verified Facts — Extractor & Feedback Loop', () => {
  // -----------------------------------------------------------------------
  // 1. Extractor correctly pulls bold elements from step HTML
  // -----------------------------------------------------------------------
  test('extractor pulls bold elements from step HTML', () => {
    const article = makeArticleWithSteps([
      {
        heading: 'Step 1 of 1:',
        text: '<p>In the panel, find the <b>Search Criteria</b> and click <b>Apply</b>.</p>',
        imgDesc: 'Panel',
        imgPath: null,
      },
    ]);

    const facts = extractFacts(article);
    expect(facts.uiElements).toContain('Search Criteria');
    expect(facts.uiElements).toContain('Apply');
  });

  // -----------------------------------------------------------------------
  // 2. Extractor identifies navigation path from Step 1 (Navigation Panel)
  // -----------------------------------------------------------------------
  test('extractor identifies navigation path from Step 1', () => {
    const article = makeArticleWithSteps([
      {
        heading: 'Step 1 of 2:',
        text: '<p>After logging in to Gate Access, in the Navigation Panel, select <b>Applicants</b>.</p>',
        imgDesc: 'Nav',
        imgPath: null,
      },
      {
        heading: 'Step 2 of 2:',
        text: '<p>Click <b>Search</b>.</p>',
        imgDesc: 'Search',
        imgPath: null,
      },
    ]);

    const facts = extractFacts(article);
    expect(facts.navPath).toBe('Applicants');
  });

  // -----------------------------------------------------------------------
  // 3. Extractor returns structured facts with all arrays populated
  // -----------------------------------------------------------------------
  test('extractor returns structured facts with all arrays populated', () => {
    const article = makeArticleWithSteps([
      {
        heading: 'Step 1 of 3:',
        text: '<p>Navigate to the <b>Applicants</b> module.</p>',
        imgDesc: 'Nav',
        imgPath: null,
      },
      {
        heading: 'Step 2 of 3:',
        text: '<p>Open the <b>Search Criteria panel</b> and select the <b>Status Filter</b> dropdown.</p>',
        imgDesc: 'Panel',
        imgPath: null,
      },
      {
        heading: 'Step 3 of 3:',
        text: '<p>Click <b>Apply</b> to see filtered results in the <b>Results Card</b>.</p>',
        imgDesc: 'Results',
        imgPath: null,
      },
    ]);

    const facts = extractFacts(article);
    expect(facts.module).toBe('Applicants');
    expect(facts.navPath).toBe('Applicants');
    expect(facts.cards.length).toBeGreaterThan(0);
    expect(facts.buttons.length).toBeGreaterThan(0);
    expect(facts.filters.length).toBeGreaterThan(0);
    expect(facts.uiElements.length).toBeGreaterThan(0);
  });
});

// =========================================================================
// TESTS — API & Feedback Loop (need server)
// =========================================================================

test.describe.serial('Verified Facts — API & Feedback Loop', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // -----------------------------------------------------------------------
  // 4. GET /api/verified-facts returns stored facts after approving
  // -----------------------------------------------------------------------
  test('GET /api/verified-facts returns stored facts after approving', async ({
    page,
  }) => {
    const art = makeApproveableArticle('vf-test-4');
    await page.request.post('/api/articles', { data: art });
    await page.request.post('/api/approve', {
      data: { articleId: art.id },
    });

    const res = await page.request.get('/api/verified-facts?module=Applicants');
    expect(res.status()).toBe(200);
    const facts = await res.json();
    expect(facts.length).toBeGreaterThan(0);

    const entry = facts.find((f: { articleId: string }) => f.articleId === art.id);
    expect(entry).toBeTruthy();
    expect(entry.facts.module).toBe('Applicants');
    expect(entry.facts.navPath).toBe('Applicants');
    expect(entry.facts.uiElements).toContain('Search');
    expect(entry.facts.uiElements).toContain('Apply');

    // Cleanup
    await page.request.delete(`/api/articles/${art.id}`);
  });

  // -----------------------------------------------------------------------
  // 5. GET /api/verified-facts for nonexistent module returns empty
  // -----------------------------------------------------------------------
  test('GET /api/verified-facts for nonexistent module returns empty array', async ({
    page,
  }) => {
    const res = await page.request.get(
      '/api/verified-facts?module=NonexistentModule'
    );
    expect(res.status()).toBe(200);
    const facts = await res.json();
    expect(Array.isArray(facts)).toBe(true);
    expect(facts.length).toBe(0);
  });

  // -----------------------------------------------------------------------
  // 6. Feedback loop integration — verified facts injected into prompt
  // -----------------------------------------------------------------------
  test('feedback loop: verified facts from approved article appear in generated prompt', async ({
    page,
  }) => {
    // (a) Create and approve an article for the Applicants module
    const art = makeApproveableArticle('vf-test-6');
    await page.request.post('/api/articles', { data: art });
    await page.request.post('/api/approve', {
      data: { articleId: art.id },
    });

    // (b) Fetch the stored facts via API (same call the generate route makes)
    const factsRes = await page.request.get('/api/verified-facts?module=Applicants');
    const storedFacts = await factsRes.json();
    expect(storedFacts.length).toBeGreaterThan(0);

    // (c) Build the VERIFIED FACTS block (same function the generate route uses)
    const verifiedFactsBlock = buildVerifiedFactsBlock(storedFacts);
    expect(verifiedFactsBlock).toContain('VERIFIED FACTS');
    expect(verifiedFactsBlock).toContain('confirmed by human review');
    expect(verifiedFactsBlock).toContain('Applicants');
    expect(verifiedFactsBlock).toContain('Apply');
    expect(verifiedFactsBlock).toContain('Do NOT flag steps that use only these verified elements');

    // (d) Verify the prompt builder inserts the block correctly
    const prompt = buildHowToPrompt({
      featureTitle: 'Applicant Status Tracking',
      featureDescription: 'Track applicant status changes.',
      module: 'Applicants',
      terminologySeed: {},
      verifiedFacts: verifiedFactsBlock,
    });

    // The VERIFIED FACTS block must appear in the prompt
    expect(prompt).toContain('VERIFIED FACTS');
    expect(prompt).toContain('confirmed by human review');
    expect(prompt).toContain('Navigation: In the Navigation Panel, select Applicants');
    expect(prompt).toContain('Apply');

    // Verify ordering: VERIFIED FACTS before INPUT FOR THIS ARTICLE
    const factsIdx = prompt.indexOf('VERIFIED FACTS');
    const inputIdx = prompt.indexOf('## INPUT FOR THIS ARTICLE');
    expect(factsIdx).toBeLessThan(inputIdx);

    // Cleanup
    await page.request.delete(`/api/articles/${art.id}`);
  });

  // -----------------------------------------------------------------------
  // 7. Generate for module with NO verified facts — no VERIFIED FACTS block
  // -----------------------------------------------------------------------
  test('generate for module with no verified facts omits VERIFIED FACTS block', async ({
    page,
  }) => {
    // Fetch facts for a module that has no approved articles
    const factsRes = await page.request.get(
      '/api/verified-facts?module=ZzNoFactsModuleZz'
    );
    const storedFacts = await factsRes.json();
    expect(storedFacts.length).toBe(0);

    // Build the block — should be empty
    const verifiedFactsBlock = buildVerifiedFactsBlock(storedFacts);
    expect(verifiedFactsBlock).toBe('');

    // Build a prompt with no verified facts
    const prompt = buildHowToPrompt({
      featureTitle: 'Monthly Reports Export',
      featureDescription: 'Export monthly reports.',
      module: 'ZzNoFactsModuleZz',
      terminologySeed: {},
      verifiedFacts: verifiedFactsBlock,
    });

    // The prompt should NOT contain VERIFIED FACTS
    expect(prompt).not.toContain('VERIFIED FACTS');
    expect(prompt).not.toContain('confirmed by human review');
  });
});
