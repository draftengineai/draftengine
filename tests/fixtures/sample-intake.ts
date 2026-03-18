/**
 * Sample intake data for a generic feature.
 * Matches the FeatureIntake type from src/lib/types/article.ts.
 */
import type { FeatureIntake } from '../../src/lib/types/article';

export const sampleIntake: FeatureIntake = {
  title: 'Add Search to Products Page',
  module: 'Products',
  changeType: 'feature',
  description:
    'Add a Search feature to the Products module. Users should be able to filter the product catalog by category (Electronics, Clothing, Home, Office) and by availability status (In Stock, Out of Stock, Pre-order). The Search panel opens via a toolbar button above the product list. Filters are applied with an Apply button and cleared with a Reset button.',
  featureUrl: 'https://jira.example.com/browse/PROD-1024',
  behaviorRulesLinks: [],
  userStories: [
    {
      title: 'Filter by category',
      description:
        'As a user, I want to filter products by category so I can quickly find items in the section I am looking for.',
    },
    {
      title: 'Filter by availability status',
      description:
        'As a user, I want to filter products by availability status so I can see which items are currently in stock.',
    },
  ],
  generateHowTo: true,
  generateWhatsNew: true,
  isUpdate: false,
  targetArticleIds: [],
};
