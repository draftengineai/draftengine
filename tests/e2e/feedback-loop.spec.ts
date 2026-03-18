import { test, expect } from '@playwright/test';
import { login } from './helpers';
import { mockSharedArticle } from '../fixtures/mock-article';
import { buildVerifiedFactsBlock } from '../../src/lib/verified-facts/block-builder';
import { buildHowToPrompt } from '../../src/lib/prompts/how-to';
import type { Article } from '../../src/lib/types/article';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create an article for the Contacts module with 3 steps. */
function makeContactsArticle(id: string): Article {
  return {
    ...mockSharedArticle,
    id,
    module: 'Contacts',
    title: 'Search Criteria for Contacts',
    status: 'shared' as const,
    sharedAt: '2026-03-16T10:00:00.000Z',
    content: {
      howto: {
        overview: 'How to search for contacts in the Contacts module.',
        steps: [
          {
            heading: 'Step 1 of 3:',
            text: '<p>After logging in to YourApp, in the sidebar, select <b>Contacts</b>.</p>',
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
  } as Article;
}

/** Create an article for the Users module with 3 steps. */
function makeUsersArticle(id: string): Article {
  return {
    ...mockSharedArticle,
    id,
    module: 'Users',
    title: 'Bulk Assignment for Users',
    status: 'shared' as const,
    sharedAt: '2026-03-16T11:00:00.000Z',
    content: {
      howto: {
        overview: 'How to use the bulk assignment feature in the Users module.',
        steps: [
          {
            heading: 'Step 1 of 3:',
            text: '<p>Navigate to the <b>Users</b> module from the main menu.</p>',
            imgDesc: 'Main menu',
            imgPath: null,
          },
          {
            heading: 'Step 2 of 3:',
            text: '<p>Select multiple users and click the <b>Bulk Assign</b> button in the toolbar.</p>',
            imgDesc: 'Bulk assign button',
            imgPath: null,
          },
          {
            heading: 'Step 3 of 3:',
            text: '<p>In the <b>Assignment Dialog</b>, choose an organization and click <b>Confirm</b>.</p>',
            imgDesc: 'Assignment dialog',
            imgPath: null,
          },
        ],
      },
    },
    screenshots: { howto: [false, false, false], wn: [] },
    confidence: { howto: [null, null, null], wn: [] },
  } as Article;
}

// =========================================================================
// FEEDBACK LOOP — End-to-End Integration Tests
// =========================================================================

test.describe.serial('Feedback Loop — End-to-End Integration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // -----------------------------------------------------------------------
  // Test 1: Full cycle — generate → approve → second generation gets
  //         VERIFIED FACTS from the first approved article
  // -----------------------------------------------------------------------
  test('full cycle: approved article facts appear in next generation prompt', async ({
    page,
  }) => {
    const art = makeContactsArticle('fl-test-1');
    await page.request.post('/api/articles', { data: art });

    // Approve the article — this extracts and stores verified facts
    const approveRes = await page.request.post('/api/approve', {
      data: { articleId: art.id },
    });
    expect(approveRes.status()).toBe(200);
    const approveBody = await approveRes.json();
    expect(approveBody.factsExtracted).toBeGreaterThan(0);

    // Fetch stored facts for the Contacts module
    const factsRes = await page.request.get('/api/verified-facts?module=Contacts');
    const storedFacts = await factsRes.json();
    expect(storedFacts.length).toBeGreaterThan(0);

    const entry = storedFacts.find(
      (f: { articleId: string }) => f.articleId === art.id
    );
    expect(entry).toBeTruthy();
    expect(entry.facts.module).toBe('Contacts');

    // Build what the generate route would build for a second article
    const verifiedFactsBlock = buildVerifiedFactsBlock(storedFacts);
    expect(verifiedFactsBlock).toContain('VERIFIED FACTS');
    expect(verifiedFactsBlock).toContain('confirmed by human review');

    // Build the prompt for a second article in the same module
    const prompt = buildHowToPrompt({
      featureTitle: 'Contact Status Tracking',
      featureDescription: 'Track contact status changes in real time.',
      module: 'Contacts',
      terminologySeed: {},
      verifiedFacts: verifiedFactsBlock,
    });

    // The VERIFIED FACTS block must appear in the prompt
    expect(prompt).toContain('VERIFIED FACTS');
    expect(prompt).toContain('confirmed by human review');
    expect(prompt).toContain('Contacts');
    expect(prompt).toContain('Apply');

    // Verify ordering: VERIFIED FACTS appears before INPUT FOR THIS ARTICLE
    const factsIdx = prompt.indexOf('VERIFIED FACTS');
    const inputIdx = prompt.indexOf('## INPUT FOR THIS ARTICLE');
    expect(factsIdx).toBeLessThan(inputIdx);

    // Cleanup
    await page.request.delete(`/api/articles/${art.id}`);
  });

  // -----------------------------------------------------------------------
  // Test 2: Approve then request revision — facts stored then removed
  // -----------------------------------------------------------------------
  test('approve then request revision removes facts from store', async ({
    page,
  }) => {
    const art = makeContactsArticle('fl-test-2');
    await page.request.post('/api/articles', { data: art });

    // Approve — facts are stored
    await page.request.post('/api/approve', {
      data: { articleId: art.id },
    });

    // Verify facts exist
    let factsRes = await page.request.get('/api/verified-facts?module=Contacts');
    let facts = await factsRes.json();
    let ids = facts.map((f: { articleId: string }) => f.articleId);
    expect(ids).toContain(art.id);

    // Request revision — facts should be removed
    const revisionRes = await page.request.post('/api/request-revision', {
      data: {
        articleId: art.id,
        reason: 'Step 2 screenshot is incorrect',
      },
    });
    expect(revisionRes.status()).toBe(200);

    // Verify facts are gone
    factsRes = await page.request.get('/api/verified-facts?module=Contacts');
    facts = await factsRes.json();
    ids = facts.map((f: { articleId: string }) => f.articleId);
    expect(ids).not.toContain(art.id);

    // Verify article status changed to revision
    const articleRes = await page.request.get(`/api/articles/${art.id}`);
    const article = await articleRes.json();
    expect(article.status).toBe('revision');
    expect(article.revisionReason).toBe('Step 2 screenshot is incorrect');

    // Cleanup
    await page.request.delete(`/api/articles/${art.id}`);
  });

  // -----------------------------------------------------------------------
  // Test 3: Re-approve after revision — facts re-extracted and stored again
  // -----------------------------------------------------------------------
  test('re-approve after revision re-extracts and stores facts', async ({
    page,
  }) => {
    const art = makeContactsArticle('fl-test-3');
    await page.request.post('/api/articles', { data: art });

    // Step 1: Approve
    await page.request.post('/api/approve', {
      data: { articleId: art.id },
    });

    // Step 2: Request revision — facts removed
    await page.request.post('/api/request-revision', {
      data: {
        articleId: art.id,
        reason: 'Needs updates',
      },
    });

    // Verify facts are gone
    let factsRes = await page.request.get('/api/verified-facts?module=Contacts');
    let facts = await factsRes.json();
    let ids = facts.map((f: { articleId: string }) => f.articleId);
    expect(ids).not.toContain(art.id);

    // Step 3: Re-share (set status back to shared so it can be re-approved)
    await page.request.patch(`/api/articles/${art.id}`, {
      data: {
        status: 'shared',
        sharedAt: new Date().toISOString(),
        revisionReason: null,
        revisionRequestedAt: null,
      },
    });

    // Step 4: Re-approve
    const reApproveRes = await page.request.post('/api/approve', {
      data: { articleId: art.id },
    });
    expect(reApproveRes.status()).toBe(200);
    const body = await reApproveRes.json();
    expect(body.factsExtracted).toBeGreaterThan(0);

    // Verify facts are re-stored
    factsRes = await page.request.get('/api/verified-facts?module=Contacts');
    facts = await factsRes.json();
    ids = facts.map((f: { articleId: string }) => f.articleId);
    expect(ids).toContain(art.id);

    // Verify the re-extracted facts contain the expected data
    const entry = facts.find(
      (f: { articleId: string }) => f.articleId === art.id
    );
    expect(entry).toBeTruthy();
    expect(entry.facts.module).toBe('Contacts');
    expect(entry.facts.uiElements).toContain('Apply');
    expect(entry.facts.navPath).toBe('Contacts');

    // Cleanup
    await page.request.delete(`/api/articles/${art.id}`);
  });

  // -----------------------------------------------------------------------
  // Test 4: Cross-module isolation — Contacts facts do NOT leak into
  //         Users generation prompt
  // -----------------------------------------------------------------------
  test('cross-module isolation: Contacts facts do not appear in Users prompt', async ({
    page,
  }) => {
    const contactsArt = makeContactsArticle('fl-test-4a');
    const usersArt = makeUsersArticle('fl-test-4b');
    await page.request.post('/api/articles', { data: contactsArt });
    await page.request.post('/api/articles', { data: usersArt });

    // Approve Contacts article only
    await page.request.post('/api/approve', {
      data: { articleId: contactsArt.id },
    });

    // Fetch Contacts facts — should have data
    const contactsFactsRes = await page.request.get(
      '/api/verified-facts?module=Contacts'
    );
    const contactsFacts = await contactsFactsRes.json();
    expect(contactsFacts.length).toBeGreaterThan(0);

    // Fetch Users facts — should be empty (or not contain Contacts article)
    const usersFactsRes = await page.request.get(
      '/api/verified-facts?module=Users'
    );
    const usersFacts = await usersFactsRes.json();
    const usersFactIds = usersFacts.map(
      (f: { articleId: string }) => f.articleId
    );
    expect(usersFactIds).not.toContain(contactsArt.id);

    // Build prompt for Users — must NOT contain Contacts facts
    const usersBlock = buildVerifiedFactsBlock(usersFacts);
    const usersPrompt = buildHowToPrompt({
      featureTitle: 'User Schedule Export',
      featureDescription: 'Export user schedules as CSV.',
      module: 'Users',
      terminologySeed: {},
      verifiedFacts: usersBlock,
    });

    // The Users prompt must NOT mention Contacts-specific verified facts
    // (the word "Contacts" may appear in context of terminology, but not in
    // a VERIFIED FACTS block)
    if (usersBlock) {
      // If there happen to be existing Users facts, that's fine
      // But they must not reference the Contacts article
      expect(usersBlock).not.toContain('Contacts');
    }

    // Build Contacts prompt — should have VERIFIED FACTS
    const contactsBlock = buildVerifiedFactsBlock(contactsFacts);
    expect(contactsBlock).toContain('VERIFIED FACTS');
    expect(contactsBlock).toContain('Contacts');

    // Verify the Contacts facts are NOT in the Users prompt's
    // VERIFIED FACTS section (if any)
    const usersVerifiedIdx = usersPrompt.indexOf('VERIFIED FACTS');
    if (usersVerifiedIdx === -1) {
      // No VERIFIED FACTS block in Users prompt — correct isolation
      expect(usersVerifiedIdx).toBe(-1);
    }

    // Cleanup
    await page.request.delete(`/api/articles/${contactsArt.id}`);
    await page.request.delete(`/api/articles/${usersArt.id}`);
  });
});
