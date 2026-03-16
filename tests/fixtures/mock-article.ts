/**
 * Pre-built Article objects for editor and component tests.
 * These match the Article type from src/lib/types/article.ts.
 */
import type {
  Article,
  HowToContent,
  WhatsNewContent,
  ConfidenceFlag,
} from '../../src/lib/types/article';

// ---------------------------------------------------------------------------
// How To content — 5 steps, 1 flag on step 3
// ---------------------------------------------------------------------------

const howToContent: HowToContent = {
  overview:
    'This article explains how to use the new Search Criteria feature in the Volunteers module to filter volunteer lists by availability and assignment status.',
  steps: [
    {
      heading: 'Step 1 of 5:',
      text: '<p>Navigate to the <b>Volunteers</b> module from the main menu.</p>',
      imgDesc: 'Screenshot showing the main menu with Volunteers highlighted',
      imgPath: null,
    },
    {
      heading: 'Step 2 of 5:',
      text: '<p>Click the <b>Search Criteria</b> button in the toolbar above the volunteer list.</p>',
      imgDesc: 'Screenshot showing the Search Criteria button in the toolbar',
      imgPath: null,
    },
    {
      heading: 'Step 3 of 5:',
      text: '<p>In the Search Criteria panel, select the desired <b>Availability</b> filter from the dropdown and choose an <b>Assignment Status</b>.</p>',
      imgDesc:
        'Screenshot showing the Search Criteria panel with Availability and Assignment Status filters',
      imgPath: null,
    },
    {
      heading: 'Step 4 of 5:',
      text: '<p>Click <b>Apply</b> to filter the volunteer list based on your selected criteria.</p>',
      imgDesc: 'Screenshot showing the Apply button and filtered results',
      imgPath: null,
    },
    {
      heading: 'Step 5 of 5:',
      text: '<p>To clear all filters, click <b>Reset</b> in the Search Criteria panel.</p>',
      imgDesc: 'Screenshot showing the Reset button in the Search Criteria panel',
      imgPath: null,
    },
  ],
};

// ---------------------------------------------------------------------------
// What's New content — 4 sections
// ---------------------------------------------------------------------------

const whatsNewContent: WhatsNewContent = {
  overview:
    'The Volunteers module now includes a Search Criteria feature that lets you filter volunteer lists by availability and assignment status.',
  introduction:
    '<p>A new <b>Search Criteria</b> feature has been added to the Volunteers module. This enhancement makes it easier to find volunteers based on their current availability and assignment status, reducing the time needed to coordinate visits.</p>',
  whereToFind:
    '<p>To access this feature, navigate to <b>Volunteers</b> from the main menu. Click the <b>Search Criteria</b> button in the toolbar above the volunteer list. Use the <b>Availability</b> dropdown and <b>Assignment Status</b> filter to narrow your results, then click <b>Apply</b>.</p>',
  closing:
    "Now it's easier than ever to find the right volunteers for your facility visits using the new Search Criteria filters.",
};

// ---------------------------------------------------------------------------
// Confidence flags
// ---------------------------------------------------------------------------

const howToConfidence: (ConfidenceFlag | null)[] = [
  null,
  null,
  {
    what: 'Assignment Status filter location',
    why: 'The feature description mentions filtering by assignment status but does not specify whether this is a dropdown, checkbox group, or toggle. The panel layout was inferred.',
    action:
      'Open the Search Criteria panel in Gate Access and verify the Assignment Status control type and position.',
  },
  null,
  null,
];

// ---------------------------------------------------------------------------
// Full Article — generated state (both types)
// ---------------------------------------------------------------------------

export const mockGeneratedArticle: Article = {
  id: 'mock-article-001',
  title: 'Search Criteria for Volunteers',
  module: 'Volunteers',
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
    'Add Search Criteria feature to Volunteers module allowing filtering by availability and assignment status.',
  isUpdate: false,
  updatedSteps: [],
  updateReason: null,
  originals: {},
  parentArticleIds: [],
  createdAt: '2026-03-16T00:00:00.000Z',
  updatedAt: '2026-03-16T00:00:00.000Z',
  sharedAt: null,
  content: {
    howto: howToContent,
    wn: whatsNewContent,
  },
  screenshots: {
    howto: [false, false, false, false, false],
    wn: [],
  },
  confidence: {
    howto: howToConfidence,
    wn: [],
  },
};

// ---------------------------------------------------------------------------
// Article in editing state (How To only, no flags)
// ---------------------------------------------------------------------------

export const mockEditingArticle: Article = {
  ...mockGeneratedArticle,
  id: 'mock-article-002',
  status: 'editing',
  types: ['howto'],
  content: {
    howto: howToContent,
  },
  confidence: {
    howto: [null, null, null, null, null],
    wn: [],
  },
};

// ---------------------------------------------------------------------------
// Shared article (with review note)
// ---------------------------------------------------------------------------

export const mockSharedArticle: Article = {
  ...mockGeneratedArticle,
  id: 'mock-article-003',
  status: 'shared',
  sharedAt: '2026-03-16T12:00:00.000Z',
  reviewNote: 'Please verify step 3 — the Search Criteria panel layout may differ from the mockup.',
};
