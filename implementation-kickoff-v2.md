# GateDoc — Implementation Kickoff v2

## What Changed Since v1

v1 covered a single flow: new article generation. Based on writer feedback, GateDoc now has two modes:

- **New article** — a feature/enhancement needs documentation from scratch
- **Update existing article** — a feature, bug fix, or story changed something, and existing KC articles need revising

Both modes share the same intake fields (title, module, type, description, ticket link, behavior rules, user stories). The update mode adds AI-powered article scanning and a revision prompt.

**This is explicitly phased. Phase 1 ships first. Phase 2 ships second. Do not interleave.**

---

## Phase 1: New Article Flow (Sprint 1)

**Goal:** Writer enters a feature spec → AI generates How To + What's New articles → Writer edits, adds screenshots, shares, prints.

This is the tracer bullet. Everything in Phase 1 is unchanged from the v1 spec.

### What to build in Phase 1:
1. Project init (Next.js, TypeScript, Tailwind, Auth.js, Anthropic SDK)
2. Type system (article.ts, pii.ts) — **includes Phase 2 fields from day one**
3. Config files (terminology-seed.json, modules.json)
4. Generation API route (api/generate/route.ts) — How To + What's New prompts
5. Landing page — article list with cards, NEW/UPDATING labels, AI progress lines
6. Intake modal — new article mode only (update mode UI deferred to Phase 2)
7. Editor page — sidebar, article canvas, formatting toolbar, screenshots, confidence flags
8. Share modal — with Steward note
9. Preview page — read-only with Steward note banner
10. Print CSS
11. Auth (Auth.js credentials, 3 hardcoded users)
12. Test fixtures + basic tests
13. CLAUDE.md

### What is NOT in Phase 1:
- Update existing article mode in the intake modal
- AI article scanning (api/scan/route.ts)
- Revision prompt (update-how-to.ts)
- Comparison view in editor (teal borders, View original, originals storage)
- Stale results detection

### Phase 1 data model includes Phase 2 fields:
The Article type includes `isUpdate`, `updatedSteps`, `updateReason`, `originals`, and `parentArticleIds` from day one — all defaulting to empty/false/null. This avoids a data model refactor when Phase 2 ships.

---

## Phase 2: Update Existing Article Flow (Sprint 2)

**Goal:** Writer enters a change description → AI scans existing articles for matches with confidence levels → Writer confirms selection → AI revises only affected steps → Writer reviews with comparison view.

### What to build in Phase 2:
1. Update mode in intake modal (mode toggle, same fields + article selector)
2. Scan API route (api/scan/route.ts) — matches change description against article library
3. Scan prompt (lib/prompts/scan-articles.ts)
4. Revision API route (api/revise/route.ts) — takes existing article + change description, revises affected steps
5. Revision prompt (lib/prompts/update-how-to.ts)
6. Editor comparison view — teal borders on revised steps, View original toggle, side-by-side comparison
7. Stale results detection in intake (description changed after scan)
8. Required field validation with stars
9. Additional test fixtures for update scenarios

---

## Initialize the Project (Phase 1)

```
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
npm install next-auth @anthropic-ai/sdk
npm install -D playwright @playwright/test
```

---

## File Structure (Complete — both phases)

```
src/
  app/
    page.tsx                        # Landing — article list
    layout.tsx                      # Root layout with auth provider
    editor/[id]/page.tsx            # Editor workbench
    preview/[id]/page.tsx           # Read-only preview (Steward note visible, excluded from print)
    api/
      auth/[...nextauth]/route.ts   # Auth.js
      generate/route.ts             # POST — Phase 1: new article generation
      scan/route.ts                 # POST — Phase 2: AI scans existing articles for matches
      revise/route.ts               # POST — Phase 2: revises existing article based on change
      articles/route.ts             # GET all, POST new
      articles/[id]/route.ts        # GET one, PATCH update
  components/
    nav.tsx
    article-card.tsx                # Landing page card with NEW/UPDATING labels
    intake-form.tsx                 # Modal — Phase 1: new mode only. Phase 2: adds update mode
    mode-toggle.tsx                 # Phase 2: New article / Update existing toggle
    article-scanner.tsx             # Phase 2: AI scan results with confidence badges
    editor-sidebar.tsx              # Two-zone sidebar
    article-canvas.tsx              # Framed article preview/editor
    step-editor.tsx                 # Single step with text + screenshot
    step-comparison.tsx             # Phase 2: View original side-by-side
    confidence-flag.tsx             # What/Why/Action flag
    screenshot-slot.tsx             # Blue dashed placeholder / filled image
    share-modal.tsx
    format-toolbar.tsx              # Bold, Underline, Undo, Redo (tooltips, not persistent hint)
  lib/
    auth/
      config.ts                     # Auth.js configuration
    prompts/
      how-to.ts                     # How To generation prompt v0.2.0
      whats-new.ts                  # What's New generation prompt v0.2.0
      scan-articles.ts              # Phase 2: scan prompt v0.1.0
      update-how-to.ts              # Phase 2: revision prompt v0.1.0
    types/
      article.ts                    # Full data model (includes Phase 2 fields)
      pii.ts                        # PIIFreePayload — covers generation AND scan payloads
    config/
      terminology-seed.json
      modules.json
    db/
      articles.ts                   # Article CRUD — JSON file for MVP
      store.json
  tests/
    fixtures/
      ftr-3849-input.json           # Applicants Search feature spec
      ftr-3126-update-input.json    # Phase 2: Resident Locator bug fix (Reset → Clear)
      pii-test-cases.json           # 3 PII inputs that must produce zero PII output
      thin-data-input.json          # Sparse input → INSUFFICIENT CONTEXT flags
    e2e/
      writer-journey.spec.ts        # Phase 1: new article E2E
      update-journey.spec.ts        # Phase 2: update article E2E
    unit/
      pii-filter.test.ts
      article-structure.test.ts
      scan-matching.test.ts         # Phase 2: scan confidence accuracy
```

---

## Data Model

```typescript
// src/lib/types/article.ts

export type ArticleType = 'howto' | 'wn';
export type ArticleStatus = 'new' | 'generated' | 'editing' | 'shared' | 'approved';
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
  terminologyValidated: boolean;  // always false until terminology doc confirmed
  reviewNote: string | null;      // Steward note — preview only, excluded from print/output

  // Phase 2 fields — included from day one, default to empty/false/null
  isUpdate: boolean;                          // false for new articles
  updatedSteps: number[];                     // indices of steps revised by AI (empty for new)
  updateReason: string | null;                // the change description that triggered the update
  originals: Record<number, string>;          // step index → original HTML before revision (empty for new)
  parentArticleIds: string[];                 // IDs of existing articles this was derived from (empty for new)

  createdAt: string;
  updatedAt: string;
  sharedAt: string | null;

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
  heading: string;        // "Step X of Y"
  text: string;           // HTML string — editable by writer
  imgDesc: string;        // Screenshot description for placeholder
  imgPath: string | null; // Path to uploaded screenshot
}

export interface WhatsNewContent {
  overview: string;
  introduction: string;   // HTML — no bold allowed
  whereToFind: string;    // HTML — bold UI elements
  closing: string;
}

export interface ConfidenceFlag {
  what: string;
  why: string;
  action: string;
}

export interface FeatureIntake {
  title: string;                              // required — feature title or change title
  module: string;                             // required
  changeType: ChangeType;                     // required
  description: string;                        // required
  featureUrl?: string;
  behaviorRulesLinks: string[];
  userStories: { title: string; description: string }[];
  generateHowTo: boolean;
  generateWhatsNew: boolean;
  // Phase 2 fields
  isUpdate: boolean;
  targetArticleIds: string[];                 // selected articles to update
}

// Phase 2: scan result
export interface ScanResult {
  articleId: string;
  title: string;
  module: string;
  types: ArticleType[];
  confidence: 'high' | 'medium' | 'low';
  reason: string;                             // AI explanation of why this article may be affected
}
```

---

## PII Safety (Covers Both Generation and Scan)

```typescript
// src/lib/types/pii.ts

/**
 * PIIFreePayload — typed constraint ensuring no PII reaches the AI API.
 * This covers BOTH generation payloads AND scan payloads.
 * Every payload sent to Anthropic MUST be of this type.
 */
export interface PIIFreePayload {
  featureTitle: string;
  featureDescription: string;
  module: string;
  changeType: string;
  behaviorRules: string;
  userStories: string;
  terminologySeed: string;
  writingStandards: string;
  // Phase 2: scan-specific fields
  existingArticleContent?: string;    // KC article HTML — contains no PII by design
  existingArticleOverview?: string;   // KC article overview text
  existingArticleBoldElements?: string[]; // UI element names extracted from bold tags
  // NEVER add: user names, facility names, resident names,
  // identification numbers, or any field from user data
}

const ALLOWED_FIELDS = new Set([
  'featureTitle', 'featureDescription', 'module', 'changeType',
  'behaviorRules', 'userStories', 'terminologySeed', 'writingStandards',
  'existingArticleContent', 'existingArticleOverview', 'existingArticleBoldElements'
]);

export function assertPIIFree(payload: Record<string, unknown>): PIIFreePayload {
  for (const key of Object.keys(payload)) {
    if (!ALLOWED_FIELDS.has(key)) {
      throw new Error(`PIIFreePayload violation: unexpected field "${key}"`);
    }
  }
  return payload as PIIFreePayload;
}
```

---

## Environment Variables

```
# .env.local — DO NOT COMMIT
ANTHROPIC_API_KEY=sk-ant-...
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
```

---

## Phase 1 Build Order

1. Types and config (article.ts, pii.ts, terminology-seed.json, modules.json)
2. Generation API route (api/generate/route.ts) — calls Anthropic with How To + What's New prompts
3. Article CRUD (lib/db/articles.ts) — JSON file store
4. Landing page (page.tsx) — article cards with NEW label, AI progress line
5. Intake modal — new article mode ONLY
6. Editor page — two-zone sidebar, article canvas, formatting toolbar, confidence flags, screenshots
7. Share modal + preview page + Steward note
8. Auth (Auth.js credentials, 3 seeded users)
9. Print CSS
10. Test fixtures (ftr-3849, PII cases, thin data) + basic tests
11. CLAUDE.md

**Phase 1 done = writer can enter a feature spec, get generated articles, edit them, share, and print.**

---

## Phase 2 Build Order

1. Mode toggle in intake modal (New / Update existing)
2. Required field validation with stars
3. Scan API route (api/scan/route.ts) + scan prompt
4. Article selector with confidence badges in intake modal
5. Stale results detection (description changed after scan)
6. Revision API route (api/revise/route.ts) + revision prompt
7. Editor comparison view (teal borders, change indicator, View original toggle)
8. UPDATING label on landing page cards
9. Test fixtures for update scenarios + scan matching tests
10. Update CLAUDE.md

**Phase 2 done = writer can describe a change, AI finds affected articles, revises them, and writer reviews with comparison view.**

---

## Prompts Summary

| Prompt | File | Phase | Version | Purpose |
|--------|------|-------|---------|---------|
| How To generation | lib/prompts/how-to.ts | 1 | v0.2.0 | Generate new How To article from feature spec |
| What's New generation | lib/prompts/whats-new.ts | 1 | v0.2.0 | Generate new What's New article from feature spec |
| Article scan | lib/prompts/scan-articles.ts | 2 | v0.1.0 | Match change description against article library |
| How To revision | lib/prompts/update-how-to.ts | 2 | v0.1.0 | Revise existing How To article based on change |

The How To and What's New generation prompts are already written and tested. The scan and revision prompts are defined below. All prompts are stored in versioned files with one-line change comments.

---

## Begin Phase 1

Start with step 1 (types and config) and step 2 (generation API route). Once the API route returns a generated Article from a FeatureIntake, the core works. Everything else is UI.
