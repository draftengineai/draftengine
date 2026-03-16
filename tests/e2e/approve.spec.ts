import { test, expect } from '@playwright/test';
import { login } from './helpers';
import { mockSharedArticle, mockGeneratedArticle } from '../fixtures/mock-article';

function makeSharedArticle(id: string) {
  return {
    ...mockSharedArticle,
    id,
    status: 'shared' as const,
  };
}

function makeSecondArticle(id: string) {
  return {
    ...mockGeneratedArticle,
    id,
    title: 'Bulk Assignment for Volunteers',
    module: 'Volunteers',
    status: 'shared' as const,
    sharedAt: '2026-03-16T12:00:00.000Z',
    content: {
      howto: {
        overview: 'How to use the bulk assignment feature in the Volunteers module.',
        steps: [
          {
            heading: 'Step 1 of 3:',
            text: '<p>Navigate to the <b>Volunteers</b> module from the main menu.</p>',
            imgDesc: 'Main menu',
            imgPath: null,
          },
          {
            heading: 'Step 2 of 3:',
            text: '<p>Select multiple volunteers and click the <b>Bulk Assign</b> button in the toolbar.</p>',
            imgDesc: 'Bulk assign button',
            imgPath: null,
          },
          {
            heading: 'Step 3 of 3:',
            text: '<p>In the <b>Assignment Dialog</b>, choose a facility and click <b>Confirm</b>.</p>',
            imgDesc: 'Assignment dialog',
            imgPath: null,
          },
        ],
      },
    },
    screenshots: { howto: [false, false, false], wn: [] },
    confidence: { howto: [null, null, null], wn: [] },
  };
}

test.describe.serial('Approve & Request Revision', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // 1. POST /api/approve sets status to "approved" and stores verified facts
  test('approve sets status to approved and stores verified facts', async ({
    page,
  }) => {
    const art = makeSharedArticle('approve-t1');
    await page.request.post('/api/articles', { data: art });

    const res = await page.request.post('/api/approve', {
      data: { articleId: art.id },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.factsExtracted).toBeGreaterThan(0);

    // Verify article status changed
    const articleRes = await page.request.get(`/api/articles/${art.id}`);
    const article = await articleRes.json();
    expect(article.status).toBe('approved');
    expect(article.approvedAt).toBeTruthy();

    // Verify facts were stored
    const factsRes = await page.request.get(
      `/api/verified-facts?module=Volunteers`
    );
    const facts = await factsRes.json();
    expect(facts.length).toBeGreaterThan(0);
    const entry = facts.find(
      (f: { articleId: string }) => f.articleId === art.id
    );
    expect(entry).toBeTruthy();
    expect(entry.facts.module).toBe('Volunteers');
    expect(entry.facts.uiElements.length).toBeGreaterThan(0);

    // Cleanup
    await page.request.delete(`/api/articles/${art.id}`);
  });

  // 2. POST /api/approve with invalid articleId returns 404
  test('approve with invalid articleId returns 404', async ({ page }) => {
    const res = await page.request.post('/api/approve', {
      data: { articleId: 'nonexistent-id-xyz' },
    });
    expect(res.status()).toBe(404);
  });

  // 3. Approving second article for same module merges facts
  test('approving second article for same module merges facts', async ({
    page,
  }) => {
    const art1 = makeSharedArticle('approve-t3a');
    const art2 = makeSecondArticle('approve-t3b');
    await page.request.post('/api/articles', { data: art1 });
    await page.request.post('/api/articles', { data: art2 });

    // Approve first
    await page.request.post('/api/approve', {
      data: { articleId: art1.id },
    });

    // Approve second
    await page.request.post('/api/approve', {
      data: { articleId: art2.id },
    });

    // Verify both entries exist in facts store
    const factsRes = await page.request.get(
      `/api/verified-facts?module=Volunteers`
    );
    const facts = await factsRes.json();

    const ids = facts.map((f: { articleId: string }) => f.articleId);
    expect(ids).toContain(art1.id);
    expect(ids).toContain(art2.id);

    // Second article should have its own unique UI elements
    const secondEntry = facts.find(
      (f: { articleId: string }) => f.articleId === art2.id
    );
    expect(secondEntry.facts.uiElements).toContain('Bulk Assign');

    // Cleanup
    await page.request.delete(`/api/articles/${art1.id}`);
    await page.request.delete(`/api/articles/${art2.id}`);
  });

  // 4. POST /api/request-revision sets status to "revision" with reason
  test('request revision sets status to revision with reason', async ({
    page,
  }) => {
    const art = makeSharedArticle('approve-t4');
    await page.request.post('/api/articles', { data: art });
    await page.request.post('/api/approve', {
      data: { articleId: art.id },
    });

    // Request revision
    const res = await page.request.post('/api/request-revision', {
      data: {
        articleId: art.id,
        reason: 'Step 3 screenshot is incorrect',
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify article status
    const articleRes = await page.request.get(`/api/articles/${art.id}`);
    const article = await articleRes.json();
    expect(article.status).toBe('revision');
    expect(article.revisionReason).toBe('Step 3 screenshot is incorrect');
    expect(article.revisionRequestedAt).toBeTruthy();

    // Cleanup
    await page.request.delete(`/api/articles/${art.id}`);
  });

  // 5. Request revision removes verified facts from that article
  test('request revision removes verified facts from that article', async ({
    page,
  }) => {
    const art1 = makeSharedArticle('approve-t5a');
    const art2 = makeSecondArticle('approve-t5b');
    await page.request.post('/api/articles', { data: art1 });
    await page.request.post('/api/articles', { data: art2 });
    await page.request.post('/api/approve', {
      data: { articleId: art1.id },
    });
    await page.request.post('/api/approve', {
      data: { articleId: art2.id },
    });

    // Request revision on first article
    await page.request.post('/api/request-revision', {
      data: {
        articleId: art1.id,
        reason: 'Needs update',
      },
    });

    // Verify first article's facts were removed, but second's remain
    const factsRes = await page.request.get(
      `/api/verified-facts?module=Volunteers`
    );
    const facts = await factsRes.json();
    const ids = facts.map((f: { articleId: string }) => f.articleId);
    expect(ids).not.toContain(art1.id);
    expect(ids).toContain(art2.id);

    // Cleanup
    await page.request.delete(`/api/articles/${art1.id}`);
    await page.request.delete(`/api/articles/${art2.id}`);
  });

  // 6. Request revision on non-approved/non-shared article returns 400
  test('request revision on non-approved article returns 400', async ({
    page,
  }) => {
    const genArticle = {
      ...mockGeneratedArticle,
      id: 'approve-t6',
      status: 'generated' as const,
    };
    await page.request.post('/api/articles', { data: genArticle });

    const res = await page.request.post('/api/request-revision', {
      data: {
        articleId: genArticle.id,
        reason: 'This should fail',
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('approved or shared');

    // Cleanup
    await page.request.delete(`/api/articles/${genArticle.id}`);
  });
});
