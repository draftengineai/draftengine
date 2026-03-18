/**
 * Default Template — Article Structure Definitions
 *
 * Defines the sections and layout for each article type.
 */

export interface SectionDefinition {
  id: string;
  label: string;
  required: boolean;
  description: string;
}

export interface ArticleStructure {
  type: string;
  label: string;
  sections: SectionDefinition[];
}

export const howToStructure: ArticleStructure = {
  type: 'howto',
  label: 'How To',
  sections: [
    {
      id: 'overview',
      label: 'Overview',
      required: true,
      description: 'One sentence, third person. States who can perform the task and what they can do.',
    },
    {
      id: 'steps',
      label: 'Steps',
      required: true,
      description: 'Numbered steps (Step X of Y). One action per step. Begin with standard opening.',
    },
    {
      id: 'notes',
      label: 'Notes / Tips / Warnings',
      required: false,
      description: 'Callouts placed beneath the step they relate to. Not bulleted.',
    },
  ],
};

export const whatsNewStructure: ArticleStructure = {
  type: 'wn',
  label: "What's New",
  sections: [
    {
      id: 'overview',
      label: 'Overview',
      required: true,
      description: 'One to two sentences. Describes who the change applies to and what it does.',
    },
    {
      id: 'introduction',
      label: 'Introduction',
      required: true,
      description: 'What changed and why it matters. No bold text. "Previously... Now..." pattern.',
    },
    {
      id: 'whereToFind',
      label: 'Where to Find It',
      required: true,
      description: 'Step-based direction. Bold all UI elements here only.',
    },
    {
      id: 'closing',
      label: 'Closing',
      required: true,
      description: '"Now it\'s easier than ever to [action]..." pattern.',
    },
  ],
};

export const articleStructures = {
  howto: howToStructure,
  wn: whatsNewStructure,
} as const;
