/**
 * Mock handler for Anthropic API calls during E2E tests.
 *
 * Intercepts POST requests to https://api.anthropic.com/v1/messages and returns
 * deterministic article content matching the real Claude output format. The
 * generate route parses fenced ```article_json blocks from the response text.
 */
import { Page, Route } from '@playwright/test';

// ---------------------------------------------------------------------------
// How To mock — 5 steps, 1 confidence flag (on step 3)
// ---------------------------------------------------------------------------

const HOWTO_ARTICLE_JSON = JSON.stringify({
  overview:
    'This article explains how to use the new Search feature in the Users module to filter user listings by category and availability status.',
  steps: [
    {
      heading: 'Step 1 of 5:',
      text: '<p>Navigate to the <b>Users</b> module from the main menu.</p>',
      imgDesc: 'Screenshot showing the main menu with Users highlighted',
    },
    {
      heading: 'Step 2 of 5:',
      text: '<p>Click the <b>Search</b> button in the toolbar above the user list.</p>',
      imgDesc: 'Screenshot showing the Search button in the toolbar',
    },
    {
      heading: 'Step 3 of 5:',
      text: '<p>In the Search panel, select the desired <b>Category</b> filter from the dropdown and choose an <b>Availability Status</b>.</p>',
      imgDesc:
        'Screenshot showing the Search panel with Category and Availability Status filters',
    },
    {
      heading: 'Step 4 of 5:',
      text: '<p>Click <b>Apply</b> to filter the user list based on your selected criteria.</p>',
      imgDesc: 'Screenshot showing the Apply button and filtered results',
    },
    {
      heading: 'Step 5 of 5:',
      text: '<p>To clear all filters, click <b>Reset</b> in the Search panel.</p>',
      imgDesc: 'Screenshot showing the Reset button in the Search panel',
    },
  ],
  confidence: {
    flags: [
      {
        step: 3,
        what: 'Availability Status filter location',
        why: 'The feature description mentions filtering by availability status but does not specify whether this is a dropdown, checkbox group, or toggle. The panel layout was inferred.',
        action:
          'Open the Search panel in YourApp and verify the Availability Status control type and position.',
      },
    ],
  },
});

const HOWTO_RESPONSE_TEXT = `Here is the How To article:

<div class="article howto">
<section><i><strong>Overview:</strong> This article explains how to use the new Search feature.</i></section>
<!-- Step Section START -->
<section><strong>Step 1 of 5:</strong><p>Navigate to the <b>Users</b> module.</p>[SCREENSHOT_PLACEHOLDER: Main menu]</section>
<!-- Step Section START -->
<section><strong>Step 2 of 5:</strong><p>Click <b>Search</b>.</p>[SCREENSHOT_PLACEHOLDER: Toolbar]</section>
<!-- Step Section START -->
<section><strong>Step 3 of 5:</strong><p>Select filters.</p>[SCREENSHOT_PLACEHOLDER: Panel]</section>
<!-- Step Section START -->
<section><strong>Step 4 of 5:</strong><p>Click <b>Apply</b>.</p>[SCREENSHOT_PLACEHOLDER: Results]</section>
<!-- Step Section START -->
<section><strong>Step 5 of 5:</strong><p>Click <b>Reset</b>.</p>[SCREENSHOT_PLACEHOLDER: Reset]</section>
</div>

\`\`\`article_json
${HOWTO_ARTICLE_JSON}
\`\`\``;

// ---------------------------------------------------------------------------
// What's New mock — 4 sections (overview, introduction, whereToFind, closing)
// ---------------------------------------------------------------------------

const WN_ARTICLE_JSON = JSON.stringify({
  overview:
    'The Users module now includes a Search feature that lets you filter user listings by category and availability status.',
  introduction:
    '<p>A new <b>Search</b> feature has been added to the Users module. This enhancement makes it easier to find users based on their current category and availability status, reducing the time needed to locate items.</p>',
  whereToFind:
    '<p>To access this feature, navigate to <b>Users</b> from the main menu. Click the <b>Search</b> button in the toolbar above the user list. Use the <b>Category</b> dropdown and <b>Availability Status</b> filter to narrow your results, then click <b>Apply</b>.</p>',
  closing:
    "Now it's easier than ever to find the right users using the new Search filters.",
});

const WN_RESPONSE_TEXT = `Here is the What's New article:

<div class="article whatsnew">
<section><i><strong>Overview:</strong> The Users module now includes Search.</i></section>
<section><strong>Introduction</strong><div><p>A new Search feature has been added.</p></div></section>
<section><strong>Where to Find It</strong><div><p>Navigate to Users and click Search.</p></div></section>
<strong>Now it's easier than ever to find the right users.</strong>
</div>

\`\`\`article_json
${WN_ARTICLE_JSON}
\`\`\``;

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/**
 * Build the Anthropic API response envelope matching the real API shape.
 * The generate route reads `content[].text` from text blocks.
 */
function buildApiResponse(text: string) {
  return {
    id: 'msg_mock_001',
    type: 'message',
    role: 'assistant',
    model: 'claude-sonnet-4-20250514',
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 500, output_tokens: 1200, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
    content: [{ type: 'text', text }],
  };
}

/**
 * Determine whether the prompt is requesting a How To or What's New article
 * by inspecting the message content sent to the API.
 */
function isHowToRequest(body: { messages?: { content?: string }[] }): boolean {
  const userMessage = body.messages?.[0]?.content ?? '';
  // The how-to prompt includes "How To" in its system text; what's-new includes "What's New"
  if (userMessage.includes("What's New") || userMessage.includes('whats-new')) {
    return false;
  }
  return true;
}

/**
 * Install the mock Anthropic route handler on a Playwright Page.
 * Intercepts all requests to the Anthropic messages endpoint and returns
 * deterministic content so E2E tests are fast, free, and repeatable.
 */
export async function mockAnthropicApi(page: Page): Promise<void> {
  await page.route('https://api.anthropic.com/v1/messages', (route: Route) => {
    const request = route.request();
    const postData = request.postData();

    let responseText = HOWTO_RESPONSE_TEXT;
    if (postData) {
      try {
        const body = JSON.parse(postData);
        responseText = isHowToRequest(body) ? HOWTO_RESPONSE_TEXT : WN_RESPONSE_TEXT;
      } catch {
        // If we can't parse, default to How To
      }
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildApiResponse(responseText)),
    });
  });
}

/**
 * Install a mock that intercepts the Next.js /api/generate route and returns
 * a thin-data article with [INSUFFICIENT CONTEXT] markers. Use this to test
 * the thin-data recovery flow in the editor.
 */
export async function mockGenerateApiThinData(page: Page): Promise<void> {
  await page.route('**/api/generate', (route: Route) => {
    const now = new Date().toISOString();

    const article = {
      id: 'mock-thin-article-001',
      title: 'New Feature',
      module: 'Settings',
      source: 'feature',
      changeType: 'feature',
      status: 'generated',
      types: ['howto', 'wn'],
      activeType: 'howto',
      writer: null,
      featureId: null,
      featureUrl: null,
      terminologyValidated: false,
      reviewNote: null,
      description: 'A search feature',
      isUpdate: false,
      updatedSteps: [],
      updateReason: null,
      originals: {},
      parentArticleIds: [],
      createdAt: now,
      updatedAt: now,
      sharedAt: null,
      approvedAt: null,
      revisionReason: null,
      revisionRequestedAt: null,
      content: {
        howto: {
          overview: '[INSUFFICIENT CONTEXT] The description provided does not contain enough detail to generate a complete overview.',
          steps: [],
        },
        wn: {
          overview: '[INSUFFICIENT CONTEXT] Unable to generate What\'s New content from the provided description.',
          introduction: '',
          whereToFind: '',
          closing: '',
        },
      },
      screenshots: {
        howto: [],
        wn: [],
      },
      confidence: {
        howto: [],
        wn: [],
      },
    };

    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify(article),
    });
  });
}

/**
 * Install a mock that intercepts the Next.js /api/scan route. Returns
 * deterministic scan results with HIGH, MEDIUM, and LOW confidence matches.
 */
export async function mockScanApi(page: Page): Promise<void> {
  await page.route('**/api/scan', (route: Route) => {
    const matches = [
      {
        articleId: 'mock-article-001',
        title: 'Search Criteria for Users',
        module: 'Users',
        types: ['howto', 'wn'],
        confidence: 'high',
        reason: 'This article directly covers the Search feature that was changed.',
      },
      {
        articleId: 'mock-article-002',
        title: 'Managing User Listings',
        module: 'Users',
        types: ['howto'],
        confidence: 'medium',
        reason: 'References the availability status filter which may have been affected by this change.',
      },
      {
        articleId: 'mock-article-003',
        title: 'Users Overview Dashboard',
        module: 'Users',
        types: ['howto', 'wn'],
        confidence: 'low',
        reason: 'Mentions product filtering in passing but is unlikely to need updates.',
      },
    ];

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ matches }),
    });
  });
}

/**
 * Install a mock that intercepts the Next.js /api/scan route and returns
 * zero matches (empty results).
 */
export async function mockScanApiEmpty(page: Page): Promise<void> {
  await page.route('**/api/scan', (route: Route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ matches: [] }),
    });
  });
}

/**
 * Install a mock that intercepts the Next.js /api/update route. Returns
 * a deterministic updated article.
 */
export async function mockUpdateApi(page: Page): Promise<void> {
  await page.route('**/api/update', (route: Route) => {
    const request = route.request();
    const postData = request.postData();
    let articleId = 'mock-article-001';

    if (postData) {
      try {
        const body = JSON.parse(postData);
        articleId = body.articleId || articleId;
      } catch {
        // default
      }
    }

    const now = new Date().toISOString();

    const article = {
      id: articleId,
      title: 'Search Criteria for Users',
      module: 'Users',
      source: 'update',
      changeType: 'enhancement',
      status: 'generated',
      types: ['howto', 'wn'],
      activeType: 'howto',
      writer: null,
      featureId: null,
      featureUrl: null,
      terminologyValidated: false,
      reviewNote: null,
      description:
        'Updated Search feature in Users module.',
      isUpdate: true,
      updatedSteps: [2, 3],
      updateReason: 'Search UI was redesigned',
      originals: { 2: 'Original step 3 text', 3: 'Original step 4 text' },
      parentArticleIds: [],
      createdAt: now,
      updatedAt: now,
      sharedAt: null,
      approvedAt: null,
      revisionReason: null,
      revisionRequestedAt: null,
      content: {
        howto: JSON.parse(HOWTO_ARTICLE_JSON),
        wn: JSON.parse(WN_ARTICLE_JSON),
      },
      screenshots: {
        howto: [false, false, false, false, false],
        wn: [],
      },
      confidence: {
        howto: [null, null, null, null, null],
        wn: [],
      },
    };

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(article),
    });
  });
}

/**
 * Install a mock that intercepts the Next.js /api/generate route instead of
 * the upstream Anthropic API. Useful when the server makes the API call
 * server-side and the browser never calls Anthropic directly.
 */
export async function mockGenerateApi(page: Page): Promise<void> {
  await page.route('**/api/generate', (route: Route) => {
    const now = new Date().toISOString();

    const article = {
      id: 'mock-article-001',
      title: 'Search Criteria for Users',
      module: 'Users',
      source: 'feature',
      changeType: 'feature',
      status: 'generated',
      types: ['howto', 'wn'],
      activeType: 'howto',
      writer: null,
      featureId: null,
      featureUrl: null,
      terminologyValidated: false,
      reviewNote: null,
      description:
        'Add Search feature to Users module allowing filtering by category and availability status.',
      isUpdate: false,
      updatedSteps: [],
      updateReason: null,
      originals: {},
      parentArticleIds: [],
      createdAt: now,
      updatedAt: now,
      sharedAt: null,
      approvedAt: null,
      revisionReason: null,
      revisionRequestedAt: null,
      content: {
        howto: JSON.parse(HOWTO_ARTICLE_JSON),
        wn: JSON.parse(WN_ARTICLE_JSON),
      },
      screenshots: {
        howto: [false, false, false, false, false],
        wn: [],
      },
      confidence: {
        howto: [
          null,
          null,
          {
            what: 'Availability Status filter location',
            why: 'The feature description mentions filtering by availability status but does not specify whether this is a dropdown, checkbox group, or toggle.',
            action: 'Open the Search panel in YourApp and verify the Availability Status control type and position.',
          },
          null,
          null,
        ],
        wn: [],
      },
    };

    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify(article),
    });
  });
}
