/**
 * Default Template — Writing Standards
 *
 * Standards for the default DraftEngine documentation template.
 * Covers tone, voice, formatting rules, and style guidelines.
 */

export const writingStandards = {
  name: 'Documentation Standards',
  version: '2025-11',

  voice: {
    tone: 'professional, confident, supportive',
    perspective: {
      overview: 'third person',
      steps: 'second person, imperative mood',
      whatsNew: 'mixed third/second person',
    },
    avoid: [
      'promotional language',
      'blaming the user',
      'future tense ("will")',
      'past tense ("was added")',
      'unnecessary padding',
    ],
  },

  formatting: {
    oxfordComma: true,
    numbers: {
      rule: 'Spell out one through nine; use numerals for 10 and above.',
      examples: ['three updates', '12 facilities'],
    },
    boldUsage: {
      howTo: 'Bold UI elements in all steps. Never bold regular words for emphasis.',
      whatsNew: 'Bold UI elements ONLY in "Where to Find It" section. Never bold in Introduction.',
    },
    notes: {
      format: '<u><b>Note:</b></u>',
      types: ['Note (clarification)', 'Tip (best practice)', 'Warning (critical/irreversible)'],
      placement: 'Indented beneath the step they relate to. Never use bullet points.',
    },
  },

  articleStructure: {
    howTo: {
      title: 'Task-oriented, not feature-oriented. e.g., "Locate a Customer Profile" not "Customer Locator Feature"',
      overview: 'Exactly one sentence, third person, states who and what.',
      steps: 'Numbered "Step X of Y:", one action per step, 5-8 steps typical.',
      stepOpening: 'Step 1 must begin with standard opening pattern.',
    },
    whatsNew: {
      title: 'Always begins with "WHAT\'S NEW?"',
      overview: 'One to two sentences maximum.',
      introduction: 'No bold text. "Previously..." then "Now..." pattern.',
      whereToFind: 'Bold all UI elements. Step-based direction.',
      closing: '"Now it\'s easier than ever to [action]..."',
    },
  },
} as const;

export type WritingStandards = typeof writingStandards;
