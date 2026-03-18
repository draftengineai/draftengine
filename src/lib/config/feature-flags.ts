/**
 * Feature flag constants shared between client and server.
 * This file must NOT import Node.js modules (fs, path, etc.)
 * so it can be safely used in 'use client' components.
 */

export interface FeatureFlags {
  updateExisting: boolean;       // "Update existing" action card + modal mode
  shareWithReviewer: boolean;     // "Share link" button in editor toolbar
  approveWorkflow: boolean;      // Approve + Request revision buttons on preview page
  confidenceFlags: boolean;      // Amber confidence flags on steps
  completedSection: boolean;     // "COMPLETED" section on landing page
  verifiedFacts: boolean;        // Inject verified facts into generation prompts
  reviewerNote: boolean;          // Reviewer note textarea in share modal
  regenerate: boolean;           // Regenerate button in editor toolbar
  deleteArticles: boolean;       // Delete button on article cards
  updateIndicators: boolean;     // Teal change borders on updated steps
}

export const DEFAULT_FLAGS: FeatureFlags = {
  // Core Tools — on by default
  confidenceFlags: true,
  regenerate: true,
  deleteArticles: true,
  reviewerNote: true,
  shareWithReviewer: true,
  // Review Workflow — off by default
  updateExisting: false,
  approveWorkflow: false,
  updateIndicators: false,
  completedSection: false,
  verifiedFacts: false,
};

export const FLAG_DESCRIPTIONS: Record<keyof FeatureFlags, string> = {
  updateExisting: 'Update existing articles action card and modal mode',
  shareWithReviewer: 'Share link button in editor toolbar',
  approveWorkflow: 'Approve and Request revision buttons on preview page',
  confidenceFlags: 'Amber confidence flags on steps',
  completedSection: 'Completed section on landing page',
  verifiedFacts: 'Inject verified facts into generation prompts',
  reviewerNote: 'Reviewer note textarea in share modal',
  regenerate: 'Regenerate button in editor toolbar',
  deleteArticles: 'Delete button on article cards',
  updateIndicators: 'Teal change borders on updated steps',
};

export const CORE_TOOLS_FLAGS: (keyof FeatureFlags)[] = [
  'confidenceFlags', 'regenerate', 'deleteArticles', 'reviewerNote', 'shareWithReviewer',
];

export const REVIEW_WORKFLOW_FLAGS: (keyof FeatureFlags)[] = [
  'updateExisting', 'approveWorkflow', 'updateIndicators', 'completedSection', 'verifiedFacts',
];
