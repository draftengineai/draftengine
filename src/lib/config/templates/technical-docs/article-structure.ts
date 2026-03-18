/**
 * Technical Docs Template — Article Structure Definitions
 *
 * Developer-focused article structures with support for code examples
 * and API references.
 */

import type { ArticleStructure } from '../default/article-structure';

export const howToStructure: ArticleStructure = {
  type: 'howto',
  label: 'How To',
  sections: [
    {
      id: 'overview',
      label: 'Overview',
      required: true,
      description: 'One sentence describing the end result of following this guide.',
    },
    {
      id: 'prerequisites',
      label: 'Prerequisites',
      required: false,
      description: 'Required setup, permissions, or dependencies before starting.',
    },
    {
      id: 'steps',
      label: 'Steps',
      required: true,
      description: 'Numbered steps with code examples where applicable.',
    },
    {
      id: 'apiReference',
      label: 'API Reference',
      required: false,
      description: 'Related endpoints, parameters, and response schemas.',
    },
    {
      id: 'troubleshooting',
      label: 'Troubleshooting',
      required: false,
      description: 'Common errors and their solutions.',
    },
  ],
};

export const whatsNewStructure: ArticleStructure = {
  type: 'wn',
  label: 'Release Notes',
  sections: [
    {
      id: 'overview',
      label: 'Summary',
      required: true,
      description: 'What changed, for whom, and migration impact level.',
    },
    {
      id: 'introduction',
      label: 'Details',
      required: true,
      description: 'Technical details of the change. Include breaking changes prominently.',
    },
    {
      id: 'whereToFind',
      label: 'Usage',
      required: true,
      description: 'API endpoint, CLI command, configuration, or UI path.',
    },
    {
      id: 'migration',
      label: 'Migration Guide',
      required: false,
      description: 'Step-by-step migration from previous version.',
    },
    {
      id: 'closing',
      label: 'References',
      required: false,
      description: 'Links to full API docs, examples repo, or changelog.',
    },
  ],
};

export const articleStructures = {
  howto: howToStructure,
  wn: whatsNewStructure,
} as const;
