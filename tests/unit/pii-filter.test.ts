import { assertPIIFree } from '../../src/lib/types/pii';

describe('PIIFreePayload', () => {
  test('accepts valid payload', () => {
    const payload = {
      featureTitle: 'Contacts Search',
      featureDescription: 'Search for contacts by name',
      module: 'Contacts',
      changeType: 'feature',
      behaviorRules: '',
      userStories: '',
      terminologySeed: '{}',
      writingStandards: 'Documentation Standards v2025-11',
    };
    expect(() => assertPIIFree(payload)).not.toThrow();
  });

  test('rejects payload with unexpected fields', () => {
    const payload = {
      featureTitle: 'Test',
      featureDescription: 'Test',
      module: 'Test',
      changeType: 'feature',
      behaviorRules: '',
      userStories: '',
      terminologySeed: '{}',
      writingStandards: '',
      userName: 'John Smith', // PII!
    };
    expect(() => assertPIIFree(payload)).toThrow('PIIFreePayload violation');
  });

  test('rejects payload with organization ID field', () => {
    const payload = {
      featureTitle: 'Test',
      featureDescription: 'Test',
      module: 'Test',
      changeType: 'feature',
      behaviorRules: '',
      userStories: '',
      terminologySeed: '{}',
      writingStandards: '',
      organizationId: 'ORG-2847', // PII!
    };
    expect(() => assertPIIFree(payload)).toThrow('PIIFreePayload violation');
  });

  test('accepts Phase 2 scan fields', () => {
    const payload = {
      featureTitle: 'Test',
      featureDescription: 'Test',
      module: 'Test',
      changeType: 'feature',
      behaviorRules: '',
      userStories: '',
      terminologySeed: '{}',
      writingStandards: '',
      existingArticleContent: '<p>Some article HTML</p>',
      existingArticleOverview: 'Overview text',
      existingArticleBoldElements: ['Search', 'Reset'],
    };
    expect(() => assertPIIFree(payload)).not.toThrow();
  });
});
