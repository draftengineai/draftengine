/**
 * Technical Docs Template — Terminology
 *
 * Generic technical terminology. Organizations should customize
 * this with their own product-specific terms.
 */

export const terminology = {
  _version: '1.0.0',
  _source: 'Generic technical documentation template',
  _note: 'Replace these with your product-specific terms.',

  roles: {
    _rule: 'Capitalize role names when used as titles.',
    terms: ['Developer', 'Admin', 'User', 'Operator', 'Maintainer'],
  },

  application: {
    _rule: 'Use the product name consistently. Never abbreviate unless defined.',
    name: '[Your Product Name]',
    incorrect_variants: ['the app', 'the system', 'the platform'],
  },

  navigation: {
    _rule: 'Standard navigation elements. Bold when referencing UI labels.',
    terms: ['Dashboard', 'Settings', 'API Keys', 'Documentation'],
  },

  ui_patterns: {
    _rule: 'Standard UI element names. Bold the exact wording in steps.',
    terms: ['Search', 'Filter', 'Export', 'Import', 'Save', 'Cancel'],
  },

  formatting_rules: {
    oxford_comma: true,
    numbers: {
      rule: 'Use numerals in technical context.',
      examples: ['3 parameters', '12 endpoints'],
    },
    code_elements: {
      rule: 'Use inline code formatting for function names, variables, file paths, and CLI commands.',
    },
  },
} as const;

export type Terminology = typeof terminology;
