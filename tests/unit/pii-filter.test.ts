import { assertPIIFree } from '../../src/lib/types/pii';

describe('PIIFreePayload', () => {
  test('accepts valid payload', () => {
    const payload = {
      featureTitle: 'Applicants Search',
      featureDescription: 'Search for applicants by name',
      module: 'Applicants',
      changeType: 'feature',
      behaviorRules: '',
      userStories: '',
      terminologySeed: '{}',
      writingStandards: 'PWP Writing Standards v2025-11',
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

  test('rejects payload with facility ID field', () => {
    const payload = {
      featureTitle: 'Test',
      featureDescription: 'Test',
      module: 'Test',
      changeType: 'feature',
      behaviorRules: '',
      userStories: '',
      terminologySeed: '{}',
      writingStandards: '',
      facilityId: 'FC-2847', // PII!
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
