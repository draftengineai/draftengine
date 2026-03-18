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
    'This article explains how to use the new Search feature in the Users module to filter user listings by category and availability status.',
  steps: [
    {
      heading: 'Step 1 of 5:',
      text: '<p>Navigate to the <b>Users</b> module from the main menu.</p>',
      imgDesc: 'Screenshot showing the main menu with Users highlighted',
      imgPath: null,
    },
    {
      heading: 'Step 2 of 5:',
      text: '<p>Click the <b>Search</b> button in the toolbar above the user list.</p>',
      imgDesc: 'Screenshot showing the Search button in the toolbar',
      imgPath: null,
    },
    {
      heading: 'Step 3 of 5:',
      text: '<p>In the Search panel, select the desired <b>Category</b> filter from the dropdown and choose an <b>Availability Status</b>.</p>',
      imgDesc:
        'Screenshot showing the Search panel with Category and Availability Status filters',
      imgPath: null,
    },
    {
      heading: 'Step 4 of 5:',
      text: '<p>Click <b>Apply</b> to filter the user list based on your selected criteria.</p>',
      imgDesc: 'Screenshot showing the Apply button and filtered results',
      imgPath: null,
    },
    {
      heading: 'Step 5 of 5:',
      text: '<p>To clear all filters, click <b>Reset</b> in the Search panel.</p>',
      imgDesc: 'Screenshot showing the Reset button in the Search panel',
      imgPath: null,
    },
  ],
};

// ---------------------------------------------------------------------------
// What's New content — 4 sections
// ---------------------------------------------------------------------------

const whatsNewContent: WhatsNewContent = {
  overview:
    'The Users module now includes a Search feature that lets you filter user listings by category and availability status.',
  introduction:
    '<p>A new <b>Search</b> feature has been added to the Users module. This enhancement makes it easier to find users based on their current category and availability status, reducing the time needed to locate items.</p>',
  whereToFind:
    '<p>To access this feature, navigate to <b>Users</b> from the main menu. Click the <b>Search</b> button in the toolbar above the user list. Use the <b>Category</b> dropdown and <b>Availability Status</b> filter to narrow your results, then click <b>Apply</b>.</p>',
  closing:
    "Now it's easier than ever to find the right users using the new Search filters.",
};

// ---------------------------------------------------------------------------
// Confidence flags
// ---------------------------------------------------------------------------

const howToConfidence: (ConfidenceFlag | null)[] = [
  null,
  null,
  {
    what: 'Availability Status filter location',
    why: 'The feature description mentions filtering by availability status but does not specify whether this is a dropdown, checkbox group, or toggle. The panel layout was inferred.',
    action:
      'Open the Search panel in YourApp and verify the Availability Status control type and position.',
  },
  null,
  null,
];

// ---------------------------------------------------------------------------
// Full Article — generated state (both types)
// ---------------------------------------------------------------------------

export const mockGeneratedArticle: Article = {
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
  priority: 0,
  createdAt: '2026-03-16T00:00:00.000Z',
  updatedAt: '2026-03-16T00:00:00.000Z',
  sharedAt: null,
  approvedAt: null,
  revisionReason: null,
  revisionRequestedAt: null,
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

// ---------------------------------------------------------------------------
// Updated article — isUpdate: true, steps 1 and 4 changed, originals populated
// ---------------------------------------------------------------------------

export const mockUpdatedArticle: Article = {
  ...mockGeneratedArticle,
  id: 'mock-article-update-001',
  status: 'generated',
  source: 'update',
  isUpdate: true,
  updatedSteps: [1, 4],
  updateReason: 'Search button moved to the sidebar in v8.3',
  originals: {
    1: '<p>Click the <b>Search</b> link in the left sidebar navigation.</p>',
    4: '<p>To clear all filters, click <b>Clear</b> at the bottom of the Search panel.</p>',
  },
  content: {
    howto: {
      overview:
        'This article explains how to use the new Search feature in the Users module to filter user listings by category and availability status.',
      steps: [
        {
          heading: 'Step 1 of 5:',
          text: '<p>Navigate to the <b>Users</b> module from the main menu.</p>',
          imgDesc: 'Screenshot showing the main menu with Users highlighted',
          imgPath: null,
        },
        {
          heading: 'Step 2 of 5:',
          text: '<p>Click the <b>Search</b> button in the toolbar above the user list.</p>',
          imgDesc: 'Screenshot showing the Search button in the toolbar',
          imgPath: null,
        },
        {
          heading: 'Step 3 of 5:',
          text: '<p>In the Search panel, select the desired <b>Category</b> filter from the dropdown and choose an <b>Availability Status</b>.</p>',
          imgDesc:
            'Screenshot showing the Search panel with Category and Availability Status filters',
          imgPath: null,
        },
        {
          heading: 'Step 4 of 5:',
          text: '<p>Click <b>Apply</b> to filter the user list based on your selected criteria.</p>',
          imgDesc: 'Screenshot showing the Apply button and filtered results',
          imgPath: null,
        },
        {
          heading: 'Step 5 of 5:',
          text: '<p>To clear all filters, click <b>Reset</b> in the Search panel.</p>',
          imgDesc: 'Screenshot showing the Reset button in the Search panel',
          imgPath: null,
        },
      ],
    },
    wn: whatsNewContent,
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

export const mockSharedArticle: Article = {
  ...mockGeneratedArticle,
  id: 'mock-article-003',
  status: 'shared',
  sharedAt: '2026-03-16T12:00:00.000Z',
  reviewNote: 'Please verify step 3 — the Search panel layout may differ from the mockup.',
};

// ---------------------------------------------------------------------------
// Approved article
// ---------------------------------------------------------------------------

export const mockApprovedArticle: Article = {
  ...mockGeneratedArticle,
  id: 'mock-article-approved-001',
  status: 'approved',
  sharedAt: '2026-03-16T10:00:00.000Z',
  approvedAt: '2026-03-16T14:30:00.000Z',
};

// ---------------------------------------------------------------------------
// Revision article
// ---------------------------------------------------------------------------

export const mockRevisionArticle: Article = {
  ...mockGeneratedArticle,
  id: 'mock-article-revision-001',
  status: 'revision',
  sharedAt: '2026-03-16T10:00:00.000Z',
  revisionReason: 'Step 3 screenshot does not match the current UI. Please update.',
  revisionRequestedAt: '2026-03-16T15:00:00.000Z',
};
