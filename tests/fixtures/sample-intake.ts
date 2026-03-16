/**
 * Sample intake data for FTR #3849.
 * Matches the FeatureIntake type from src/lib/types/article.ts.
 */
import type { FeatureIntake } from '../../src/lib/types/article';

export const ftr3849Intake: FeatureIntake = {
  title: 'Search Criteria for Volunteers',
  module: 'Volunteers',
  changeType: 'feature',
  description:
    'Add a Search Criteria feature to the Volunteers module. Users should be able to filter the volunteer list by availability (Available, Unavailable, Limited) and by assignment status (Assigned, Unassigned, Pending). The Search Criteria panel opens via a toolbar button above the volunteer list. Filters are applied with an Apply button and cleared with a Reset button.',
  featureUrl: 'https://jira.example.com/browse/FTR-3849',
  behaviorRulesLinks: [],
  userStories: [
    {
      title: 'Filter by availability',
      description:
        'As a coordinator, I want to filter volunteers by availability so I can quickly find who is available for upcoming visits.',
    },
    {
      title: 'Filter by assignment status',
      description:
        'As a coordinator, I want to filter volunteers by assignment status so I can see which volunteers still need to be assigned to a facility.',
    },
  ],
  generateHowTo: true,
  generateWhatsNew: true,
  isUpdate: false,
  targetArticleIds: [],
};
