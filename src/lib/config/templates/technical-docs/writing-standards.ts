/**
 * Technical Docs Template — Writing Standards
 *
 * Developer-focused documentation template.
 * Uses a more direct, technical tone with support for code examples and API references.
 */

export const writingStandards = {
  name: 'Technical Documentation Standards',
  version: '1.0.0',

  voice: {
    tone: 'direct, precise, technical',
    perspective: {
      overview: 'third person',
      steps: 'second person, imperative mood',
      whatsNew: 'third person, factual',
    },
    avoid: [
      'marketing language',
      'vague descriptions',
      'unnecessary adjectives',
      'hedging ("might", "possibly", "should")',
    ],
  },

  formatting: {
    oxfordComma: true,
    numbers: {
      rule: 'Use numerals for all numbers in technical context.',
      examples: ['3 parameters', '12 endpoints'],
    },
    boldUsage: {
      howTo: 'Bold UI elements, API endpoints, and command names.',
      whatsNew: 'Bold breaking changes and new API surface.',
    },
    notes: {
      format: '> **Note:**',
      types: ['Note (clarification)', 'Important (prerequisite)', 'Warning (breaking change)', 'Tip (best practice)'],
      placement: 'Beneath the step or section they relate to.',
    },
    codeBlocks: {
      enabled: true,
      languages: ['javascript', 'typescript', 'bash', 'json', 'python'],
      style: 'Fenced code blocks with language identifier.',
    },
  },

  articleStructure: {
    howTo: {
      title: 'Action-oriented. e.g., "Configure OAuth2 Authentication" not "OAuth2 Feature"',
      overview: 'One sentence describing the end result.',
      steps: 'Numbered steps. Include code snippets where applicable.',
      stepOpening: 'Prerequisites listed before Step 1 if any.',
    },
    whatsNew: {
      title: 'Version number + feature name. e.g., "v2.1: Batch API Support"',
      overview: 'What changed, for whom, and migration impact.',
      introduction: 'Technical summary. Include breaking changes prominently.',
      whereToFind: 'API endpoint, CLI command, or UI path.',
      closing: 'Link to full API reference or migration guide.',
    },
  },
} as const;

export type WritingStandards = typeof writingStandards;
