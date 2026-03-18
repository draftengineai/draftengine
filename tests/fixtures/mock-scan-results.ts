/**
 * Deterministic scan response for E2E tests.
 * Two matches: one HIGH confidence, one MEDIUM confidence.
 */
import type { ScanResult } from '../../src/lib/types/article';

export const mockScanMatches: ScanResult[] = [
  {
    articleId: 'mock-article-001',
    title: 'Search Criteria for Users',
    module: 'Users',
    types: ['howto', 'wn'],
    confidence: 'high',
    reason:
      'This article references the Search button and Category filter in Steps 2, 3, and 4, which are directly affected by the described change to filter behavior.',
  },
  {
    articleId: 'mock-article-002',
    title: 'Managing User Listings',
    module: 'Users',
    types: ['howto'],
    confidence: 'medium',
    reason:
      'This article covers the Users module and references Availability Status in the overview, which may be indirectly affected by changes to search filtering.',
  },
  {
    articleId: 'mock-article-003',
    title: 'Users Overview Dashboard',
    module: 'Users',
    types: ['howto'],
    confidence: 'low',
    reason:
      'Mentions user filtering in passing but is unlikely to need updates.',
  },
];

/**
 * Build the raw Anthropic API response JSON that the scan route expects.
 * The scan prompt asks for a plain JSON array (no fences).
 */
export const mockScanApiResponseText = JSON.stringify(
  mockScanMatches.map(m => ({
    articleId: m.articleId,
    title: m.title,
    module: m.module,
    types: m.types,
    confidence: m.confidence,
    reason: m.reason,
  }))
);

/**
 * Build a full Anthropic messages API response envelope containing
 * the scan results as the text content.
 */
export function buildMockScanApiResponse() {
  return {
    id: 'msg_mock_scan_001',
    type: 'message',
    role: 'assistant',
    model: 'claude-sonnet-4-20250514',
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens: 800,
      output_tokens: 300,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
    content: [{ type: 'text', text: mockScanApiResponseText }],
  };
}

/** Empty scan response — no matches found. */
export function buildMockScanEmptyResponse() {
  return {
    id: 'msg_mock_scan_002',
    type: 'message',
    role: 'assistant',
    model: 'claude-sonnet-4-20250514',
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens: 400,
      output_tokens: 10,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
    content: [{ type: 'text', text: '[]' }],
  };
}
