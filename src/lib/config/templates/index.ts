/**
 * Template System — Loader
 *
 * Loads the active template based on DRAFTENGINE_TEMPLATE env var.
 * Defaults to "default" if not set.
 *
 * Available templates:
 * - "default" — Knowledge center documentation (original DraftEngine style)
 * - "technical-docs" — Developer-focused docs with code examples and API references
 */

import * as defaultTemplate from './default';
import * as technicalDocsTemplate from './technical-docs';

export type TemplateName = 'default' | 'technical-docs';

export interface Template {
  writingStandards: Record<string, unknown>;
  articleStructures: Record<string, unknown>;
  terminology: Record<string, unknown>;
}

const templates: Record<TemplateName, Template> = {
  default: defaultTemplate as unknown as Template,
  'technical-docs': technicalDocsTemplate as unknown as Template,
};

function getTemplateName(): TemplateName {
  const name = process.env.DRAFTENGINE_TEMPLATE?.toLowerCase();
  if (name && name in templates) return name as TemplateName;
  return 'default';
}

/** Returns the active template. */
export function getTemplate(): Template & { name: TemplateName } {
  const name = getTemplateName();
  return { ...templates[name], name };
}

/** Returns the active template name. */
export function getActiveTemplateName(): TemplateName {
  return getTemplateName();
}

/** Returns all available template names. */
export function getAvailableTemplates(): TemplateName[] {
  return Object.keys(templates) as TemplateName[];
}
