import { Article, FeatureIntake } from '../../src/lib/types/article';

describe('Article type structure', () => {
  test('new article has Phase 2 fields with defaults', () => {
    const article: Article = {
      id: 'test-1',
      title: 'Test Article',
      module: 'Applicants',
      source: 'feature',
      changeType: 'enhancement',
      status: 'new',
      types: ['howto'],
      activeType: 'howto',
      writer: null,
      featureId: null,
      featureUrl: null,
      terminologyValidated: false,
      reviewNote: null,
      description: null,
      isUpdate: false,
      updatedSteps: [],
      updateReason: null,
      originals: {},
      parentArticleIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sharedAt: null,
      content: {},
      screenshots: { howto: [], wn: [] },
      confidence: { howto: [], wn: [] },
    };

    expect(article.isUpdate).toBe(false);
    expect(article.updatedSteps).toEqual([]);
    expect(article.updateReason).toBeNull();
    expect(article.originals).toEqual({});
    expect(article.parentArticleIds).toEqual([]);
  });

  test('FeatureIntake includes Phase 2 fields', () => {
    const intake: FeatureIntake = {
      title: 'Test',
      module: 'Applicants',
      changeType: 'feature',
      description: 'Test description',
      behaviorRulesLinks: [],
      userStories: [],
      generateHowTo: true,
      generateWhatsNew: true,
      isUpdate: false,
      targetArticleIds: [],
    };

    expect(intake.isUpdate).toBe(false);
    expect(intake.targetArticleIds).toEqual([]);
  });

  test('article supports both howto and wn content', () => {
    const article: Article = {
      id: 'test-2',
      title: 'Test',
      module: 'Applicants',
      source: 'feature',
      changeType: 'feature',
      status: 'generated',
      types: ['howto', 'wn'],
      activeType: 'howto',
      writer: 'User One',
      featureId: null,
      featureUrl: null,
      terminologyValidated: false,
      reviewNote: null,
      description: null,
      isUpdate: false,
      updatedSteps: [],
      updateReason: null,
      originals: {},
      parentArticleIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sharedAt: null,
      content: {
        howto: {
          overview: 'Test overview',
          steps: [
            { heading: 'Step 1 of 1', text: '<p>Test step</p>', imgDesc: 'Test', imgPath: null },
          ],
        },
        wn: {
          overview: 'Test WN overview',
          introduction: '<p>Test intro</p>',
          whereToFind: '<p>Test directions</p>',
          closing: 'Now it\'s easier than ever to test.',
        },
      },
      screenshots: { howto: [false], wn: [] },
      confidence: { howto: [null], wn: [] },
    };

    expect(article.content.howto?.steps).toHaveLength(1);
    expect(article.content.wn?.closing).toContain('easier than ever');
  });
});
