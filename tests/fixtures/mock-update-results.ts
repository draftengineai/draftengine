/**
 * Deterministic update response for E2E tests.
 * Simulates revising 2 steps (indices 1 and 4) out of 5 total.
 * The change: "Reset" button renamed to "Clear" and Search panel
 * now auto-collapses after applying filters.
 */
import type { Article } from '../../src/lib/types/article';

/**
 * The mock AI response JSON matching the update-how-to prompt output format.
 * Steps 0, 2, 3 are unchanged; steps 1 and 4 are revised.
 */
export const mockUpdateResponse = {
  title: 'Search Criteria for Users',
  overview:
    'This article explains how to use the new Search feature in the Users module to filter user listings by category and availability status.',
  updatedSteps: [1, 4],
  steps: [
    {
      heading: 'Step 1 of 5:',
      text: '<p>Navigate to the <b>Users</b> module from the main menu.</p>',
      imgDesc: 'Screenshot showing the main menu with Users highlighted',
      isRevised: false,
    },
    {
      heading: 'Step 2 of 5:',
      text: '<p>Click the <b>Search</b> button in the toolbar above the user list. The panel opens on the right side of the screen.</p>',
      imgDesc: 'Screenshot showing the Search button and the expanded panel',
      isRevised: true,
    },
    {
      heading: 'Step 3 of 5:',
      text: '<p>In the Search panel, select the desired <b>Category</b> filter from the dropdown and choose an <b>Availability Status</b>.</p>',
      imgDesc:
        'Screenshot showing the Search panel with Category and Availability Status filters',
      isRevised: false,
    },
    {
      heading: 'Step 4 of 5:',
      text: '<p>Click <b>Apply</b> to filter the user list based on your selected criteria.</p>',
      imgDesc: 'Screenshot showing the Apply button and filtered results',
      isRevised: false,
    },
    {
      heading: 'Step 5 of 5:',
      text: '<p>To clear all filters, click <b>Clear</b> in the Search panel.</p>',
      imgDesc: 'Screenshot showing the Clear button in the Search panel',
      isRevised: true,
    },
  ],
  originals: {
    '1': '<p>Click the <b>Search</b> button in the toolbar above the user list.</p>',
    '4': '<p>To clear all filters, click <b>Reset</b> in the Search panel.</p>',
  },
  confidence: [
    null,
    {
      what: 'Panel expansion behavior',
      why: 'The change description mentions the panel opens on the right but does not specify the exact animation or width. The layout was inferred.',
      action: 'Open YourApp and verify the Search panel position and behavior.',
    },
    null,
    null,
    null,
  ],
  updateSummary:
    'Renamed "Reset" to "Clear" in step 5 and added panel expansion detail to step 2 based on the UI change description.',
};

/**
 * Raw text the Anthropic API would return — plain JSON (no fences),
 * matching how the update-how-to prompt requests output.
 */
export const mockUpdateApiResponseText = JSON.stringify(mockUpdateResponse);

/**
 * Full Anthropic messages API response envelope for the update call.
 */
export function buildMockUpdateApiResponse() {
  return {
    id: 'msg_mock_update_001',
    type: 'message',
    role: 'assistant',
    model: 'claude-sonnet-4-20250514',
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens: 1200,
      output_tokens: 600,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
    content: [{ type: 'text', text: mockUpdateApiResponseText }],
  };
}

/**
 * Build a complete updated Article object from the mock response,
 * given an original article. Used to mock the /api/update route response.
 */
export function buildMockUpdatedArticle(original: Article): Article {
  const now = new Date().toISOString();
  return {
    ...original,
    status: 'generated',
    isUpdate: true,
    updateReason: 'Reset button renamed to Clear; Search panel now auto-expands on open.',
    updatedSteps: mockUpdateResponse.updatedSteps,
    originals: Object.fromEntries(
      Object.entries(mockUpdateResponse.originals).map(([k, v]) => [Number(k), v])
    ),
    updatedAt: now,
    content: {
      ...original.content,
      howto: {
        overview: mockUpdateResponse.overview,
        steps: mockUpdateResponse.steps.map((s) => ({
          heading: s.heading,
          text: s.text,
          imgDesc: s.imgDesc,
          imgPath: null,
        })),
      },
    },
    confidence: {
      ...original.confidence,
      howto: mockUpdateResponse.confidence,
    },
  };
}
