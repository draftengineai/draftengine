export type ArticleType = 'howto' | 'wn';
export type ArticleStatus = 'new' | 'generated' | 'editing' | 'shared' | 'approved' | 'revision';
export type ChangeType = 'enhancement' | 'feature' | 'bugfix' | string;

export interface Article {
  id: string;
  title: string;
  module: string;
  source: 'feature' | 'gap' | 'manual' | 'update';
  changeType: ChangeType;
  status: ArticleStatus;
  types: ArticleType[];
  activeType: ArticleType;
  writer: string | null;
  featureId: string | null;
  featureUrl: string | null;
  terminologyValidated: boolean;
  reviewNote: string | null;
  description: string | null;

  // Phase 2 fields — included from day one, default to empty/false/null
  isUpdate: boolean;
  updatedSteps: number[];
  updateReason: string | null;
  originals: Record<number, string>;
  parentArticleIds: string[];

  createdAt: string;
  updatedAt: string;
  sharedAt: string | null;
  approvedAt: string | null;
  revisionReason: string | null;
  revisionRequestedAt: string | null;

  content: {
    howto?: HowToContent;
    wn?: WhatsNewContent;
  };
  screenshots: Record<ArticleType, boolean[]>;
  confidence: Record<ArticleType, (ConfidenceFlag | null)[]>;
}

export interface HowToContent {
  overview: string;
  steps: Step[];
}

export interface Step {
  heading: string;
  text: string;
  imgDesc: string;
  imgPath: string | null;
}

export interface WhatsNewContent {
  overview: string;
  introduction: string;
  whereToFind: string;
  closing: string;
}

export interface ConfidenceFlag {
  what: string;
  why: string;
  action: string;
}

export interface FeatureIntake {
  title: string;
  module: string;
  changeType: ChangeType;
  description: string;
  featureUrl?: string;
  behaviorRulesLinks: string[];
  userStories: { title: string; description: string }[];
  generateHowTo: boolean;
  generateWhatsNew: boolean;
  // Phase 2 fields
  isUpdate: boolean;
  targetArticleIds: string[];
}

// Phase 2: scan result
export interface ScanResult {
  articleId: string;
  title: string;
  module: string;
  types: ArticleType[];
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}
