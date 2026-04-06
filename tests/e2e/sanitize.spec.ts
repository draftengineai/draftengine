import { test, expect, Page } from '@playwright/test';
import { signTestCookie } from './helpers';
import type { Article } from '../../src/lib/types/article';
import { mockGeneratedArticle } from '../fixtures/mock-article';

/**
 * Sanitization tests — verify that XSS payloads in article content
 * are stripped before rendering in preview (public) and editor (auth'd).
 */

function cloneArticle(): Article {
  return JSON.parse(JSON.stringify(mockGeneratedArticle));
}

function injectPayload(article: Article, payload: string): Article {
  if (article.content.howto) {
    article.content.howto.overview = payload;
    article.content.howto.steps[0].text = payload;
  }
  return article;
}

async function seedMaliciousArticle(page: Page, article: Article) {
  const token = await signTestCookie();
  await page.context().addCookies([
    { name: 'draftengine_auth', value: token, domain: 'localhost', path: '/' },
  ]);
  await page.route(`**/api/articles/${article.id}`, async (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(article) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(article) });
  });
}

test.describe('XSS sanitization', () => {
  const XSS_PAYLOADS = [
    { name: 'script tag', payload: '<b>safe</b><script>window.__XSS=true</script>' },
    { name: 'event handler', payload: '<b onmouseover="window.__XSS=true">hover</b>' },
    { name: 'javascript: URL', payload: '<a href="javascript:window.__XSS=true">click</a>' },
    { name: 'img onerror', payload: '<img src=x onerror="window.__XSS=true">' },
    { name: 'SVG script', payload: '<svg><script>window.__XSS=true</script></svg>' },
  ];

  for (const { name, payload } of XSS_PAYLOADS) {
    test(`preview strips ${name}`, async ({ page }) => {
      const article = injectPayload(cloneArticle(), payload);

      await page.route(`**/api/articles/${article.id}`, async (route) => {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(article) });
      });
      await page.route('**/api/admin/features', async (route) => {
        return route.fulfill({ status: 200, json: { approveWorkflow: false } });
      });

      await page.goto(`/preview/${article.id}`);
      await page.waitForSelector('h1');

      // Verify no XSS executed
      const xssFired = await page.evaluate(() => (window as unknown as Record<string, unknown>).__XSS);
      expect(xssFired).toBeFalsy();
    });

    test(`editor strips ${name}`, async ({ page }) => {
      const article = injectPayload(cloneArticle(), payload);
      await seedMaliciousArticle(page, article);
      await page.route('**/api/admin/features', async (route) => {
        return route.fulfill({ status: 200, json: { confidenceFlags: true, regenerate: true, shareWithReviewer: true, updateIndicators: false } });
      });

      await page.goto(`/editor/${article.id}`);
      await page.waitForSelector('[data-step="0"]', { timeout: 15000 });

      // Verify no XSS executed
      const xssFired = await page.evaluate(() => (window as unknown as Record<string, unknown>).__XSS);
      expect(xssFired).toBeFalsy();
    });
  }
});
