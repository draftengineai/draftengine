/**
 * PIIFreePayload — typed constraint ensuring no PII reaches the AI API.
 * This covers BOTH generation payloads AND scan payloads.
 * Every payload sent to Anthropic MUST be of this type.
 */
export interface PIIFreePayload {
  featureTitle: string;
  featureDescription: string;
  module: string;
  changeType: string;
  behaviorRules: string;
  userStories: string;
  terminologySeed: string;
  writingStandards: string;
  // Phase 2: scan-specific fields
  existingArticleContent?: string;
  existingArticleOverview?: string;
  existingArticleBoldElements?: string[];
  // NEVER add: user names, organization names, customer names,
  // identification numbers, or any field from user data
}

const ALLOWED_FIELDS = new Set([
  'featureTitle', 'featureDescription', 'module', 'changeType',
  'behaviorRules', 'userStories', 'terminologySeed', 'writingStandards',
  'existingArticleContent', 'existingArticleOverview', 'existingArticleBoldElements'
]);

export function assertPIIFree(payload: Record<string, unknown>): PIIFreePayload {
  for (const key of Object.keys(payload)) {
    if (!ALLOWED_FIELDS.has(key)) {
      throw new Error(`PIIFreePayload violation: unexpected field "${key}"`);
    }
  }
  return payload as unknown as PIIFreePayload;
}
