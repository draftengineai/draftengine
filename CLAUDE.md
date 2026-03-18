# GateDoc

GateDoc is a Next.js application that generates Knowledge Center articles from feature specifications using AI. Writers enter feature specs via an intake form, and the AI generates How To and What's New articles. Writers then edit, add screenshots, share with Reviewers, and print to PDF.

## Tech Stack

- **Framework:** Next.js 14+ (App Router, TypeScript, src directory)
- **Styling:** Tailwind CSS + custom CSS variables
- **Auth:** Simple password gate via middleware (env var `GATEDOC_PASSWORD`) + Auth.js (next-auth) for user identity
- **Persistence:** Vercel KV in production, local `store.json` fallback in dev
- **AI:** Multi-provider (Anthropic Claude, OpenAI, Ollama) via `src/lib/ai/provider.ts`
- **Testing:** Jest (unit) + Playwright (E2E)
- **Deployment:** Vercel, project name "gatedoc"

## File Structure

```
src/
  middleware.ts                     # Auth gate — redirects to /login without cookie
  app/
    page.tsx                        # Landing — article list
    layout.tsx                      # Root layout with auth provider
    editor/[id]/page.tsx            # Editor workbench
    preview/[id]/page.tsx           # Read-only preview
    login/page.tsx                  # Password gate login page (writer + admin)
    admin/
      dashboard/page.tsx            # Admin dashboard — feature flags + stats
    api/
      auth/route.ts                 # POST — password auth (writer + admin roles)
      auth/[...nextauth]/route.ts   # Auth.js (user identity)
      generate/route.ts             # POST — new article generation (injects verified facts)
      admin/
        features/route.ts           # GET/POST — feature flags CRUD
        stats/route.ts              # GET — article counts and verified facts summary
      articles/route.ts             # GET all, POST new
      articles/[id]/route.ts        # GET one, PATCH update
      scan/route.ts                 # POST — AI scan for affected articles
      update/route.ts               # POST — generate updated article with revised steps
      approve/route.ts              # POST — approve article, extract verified facts
      request-revision/route.ts     # POST — request revision, remove verified facts
      verified-facts/route.ts       # GET — retrieve stored verified facts by module
  components/
    nav.tsx
    article-card.tsx
    intake-form.tsx
    editor-sidebar.tsx
    article-canvas.tsx
    step-editor.tsx
    confidence-flag.tsx
    screenshot-slot.tsx
    share-modal.tsx
    format-toolbar.tsx
    export-menu.tsx                 # HTML + Markdown export dropdown
    generation-loading.tsx
  lib/
    ai/
      provider.ts                   # Multi-provider AI abstraction (Anthropic/OpenAI/Ollama)
    auth/config.ts
    prompts/
      how-to.ts                     # v0.2.0
      whats-new.ts                  # v0.2.0
      scan-articles.ts              # Phase 2 prompt (v0.1.0) — deferred
      update-how-to.ts              # Phase 2 prompt (v0.1.0) — deferred
    types/
      article.ts                    # Full data model (includes Phase 2 fields)
      pii.ts                        # PIIFreePayload typed constraint
    config/
      terminology-seed.json
      modules.json
      features.ts                   # Feature flags system (KV + local JSON fallback)
      templates/                    # Template system
        index.ts                    # Loads active template from GATEDOC_TEMPLATE env var
        default/                    # Default knowledge center template
          writing-standards.ts
          article-structure.ts
          terminology.ts
        technical-docs/             # Developer-focused template
          writing-standards.ts
          article-structure.ts
          terminology.ts
    hooks/
      useFeatures.ts                # React hook for client-side feature flag access
    verified-facts/
      extractor.ts                  # Extract verified facts from approved article content
      store.ts                      # Module-scoped fact storage (Vercel KV / local JSON)
      block-builder.ts              # Build VERIFIED FACTS prompt block
    db/
      storage.ts                    # Article CRUD — Vercel KV (prod) / store.json (dev)
      articles.ts                   # Legacy sync CRUD (kept for reference)
      verified-facts-store.json     # Local dev store for verified facts
tests/
  fixtures/
    sample-feature-input.json
    pii-test-cases.json
    thin-data-input.json
    mock-anthropic.ts              # Mock Anthropic API / generate route for E2E
    mock-article.ts                # Pre-built Article objects for editor tests
    mock-scan-results.ts           # Mock scan API responses
    mock-update-results.ts         # Mock update API responses
    sample-intake.ts               # Sample FeatureIntake data for tests
  e2e/
    writer-journey.spec.ts
    feedback-loop.spec.ts          # Full feedback loop integration (4 tests)
    admin.spec.ts                  # Admin dashboard: auth, flag toggles, integration (6 tests)
    landing-contextual.spec.ts     # Contextual landing: empty/articles/action cards (7 tests)
  unit/
    pii-filter.test.ts
    article-structure.test.ts
```

## Key Constraints

- **PIIFreePayload**: Every payload sent to the AI provider MUST be typed as PIIFreePayload. No PII (user names, organization names, customer names, IDs) ever reaches the API.
- **Terminology**: Organization-specific terms loaded from `src/lib/config/terminology-seed.json`. Non-negotiable usage rules.
- **Prompts**: Versioned in `src/lib/prompts/`. Each prompt file has a version constant and a builder function.
- **Phase 2 fields in data model**: Article type includes `isUpdate`, `updatedSteps`, `updateReason`, `originals`, `parentArticleIds` from day one — all default to empty/false/null.
- **Phase 2 complete**: All update mode, scan API, approve/revision API, comparison view, and feedback loop features are shipped.

## How to Run

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Configure environment (see .env.example for all variables):
cp .env.example .env.local
# Edit .env.local — required: ANTHROPIC_API_KEY, GATEDOC_PASSWORD, GATEDOC_ADMIN_PASSWORD, NEXTAUTH_SECRET

# Optional — AI provider (default: anthropic):
# AI_PROVIDER=openai|ollama
# OPENAI_API_KEY=sk-...
# OLLAMA_BASE_URL=http://localhost:11434
# OLLAMA_MODEL=llama3.1

# Optional — Template (default: "default"):
# GATEDOC_TEMPLATE=technical-docs

# Optional — Vercel KV (auto-set by Vercel when KV store is linked):
# KV_REST_API_URL=https://...
# KV_REST_API_TOKEN=...
# When KV env vars are absent, articles are stored in src/lib/db/store.json
```

## How to Test

```bash
# E2E tests (Playwright — Chromium)
npm test                  # run all E2E specs headless
npm run test:ui           # open Playwright UI mode

# Unit tests (Jest)
npm run test:unit
```

Tests use mocked API responses — no real Anthropic API calls are made. Set `GATEDOC_PASSWORD=test` and `ANTHROPIC_API_KEY=test-key` when running outside of `.env.local`.

### Sprint 1 Test Summary — 10 spec files, 73 tests

| Spec file | Tests | Coverage |
|---|---|---|
| `auth.spec.ts` | 6 | Login page, password auth, redirect protection, preview access, session persistence |
| `landing.spec.ts` | 6 | Empty state, article cards, badges, new/update buttons, delete with confirmation |
| `generate.spec.ts` | 6 | Intake form fields, validation, short-description warning, generation flow, article type checkboxes |
| `editor-howto.spec.ts` | 8 | How To editor: title, overview, steps, bold elements, screenshots, contenteditable, sidebar tabs/checklist |
| `editor-whatsnew.spec.ts` | 7 | What's New editor: tab switching, title, overview, sections (intro/where/closing), tab persistence |
| `flags.spec.ts` | 10 | Confidence flags: render, WHAT/WHY/ACTION fields, dismiss, sidebar count, persistence, verified-input skip |
| `regenerate.spec.ts` | 8 | Regenerate button, modal pre-fill, optional feedback field, warning, cancel, content replacement, flag reset |
| `share.spec.ts` | 7 | Share button, modal, preview URL, Reviewer note, save & copy, cancel |
| `preview.spec.ts` | 10 | Preview banner, Reviewer label, article content, steps, bold, screenshots, no raw HTML, Reviewer note, no-auth access |
| `thin-data.spec.ts` | 5 | Thin data detection, banner, write-manually recovery, regenerate from thin, INSUFFICIENT CONTEXT display |

### Test Fixtures (tests/fixtures/)

- **mock-anthropic.ts** — Intercepts Anthropic API / `/api/generate` calls with deterministic responses. Provides `mockAnthropicApi(page)` for upstream interception and `mockGenerateApi(page)` for route-level interception.
- **mock-article.ts** — Pre-built `Article` objects: `mockGeneratedArticle`, `mockEditingArticle`, `mockSharedArticle`. How To has 5 steps with 1 confidence flag on step 3; What's New has all 4 sections.
- **sample-intake.ts** — Sample `FeatureIntake` data (`sampleIntake`): "Add Search to Products Page", module Products, 2 user stories.

## Deployment

- Platform: Vercel
- Project name: `gatedoc`
- Environment variables must be set in Vercel dashboard

## Current Status — Phase 2 MERGED TO MAIN (2026-03-17)

Phase 2 merged to main and deployed to Vercel on 2026-03-17. All features shipped, 165 tests (158 E2E + 7 unit).

### Phase 2 Sprint 1: Regression Test Infrastructure — COMPLETE

- **73 E2E tests** across 10 spec files — all passing
- Playwright config: `testDir: ./tests/e2e`, `retries: 1`, Chromium only, dev server auto-start
- Test fixtures: `mock-anthropic.ts`, `mock-article.ts`, `sample-intake.ts`
- Package scripts: `test` → Playwright, `test:ui` → Playwright UI, `test:unit` → Jest
- GitHub Actions CI: `.github/workflows/test.yml` — runs on push to main/phase-2 and PRs to main
- All tests use mocked API responses — no real Anthropic calls

### Phase 2 Sprint 2: Article Update Flow — COMPLETE

- **Scan API** (`/api/scan`) — AI-powered article scanning to find articles affected by feature changes
- **Update API** (`/api/update`) — Generates revised articles with updated steps, originals preserved
- **Update intake mode** — Mode toggle in intake form, "Find affected articles" scan flow, confidence badges (HIGH/MEDIUM/LOW)
- **Scan results UI** — Checkboxes pre-checked for HIGH/MEDIUM, Update selected triggers batch updates
- **Editor update indicators** — Teal left border on changed steps, "Changed" badge, "View original" toggle
- **Update banner** — Shows update reason and changed step count in editor
- **Landing page badges** — Updated, Approved, Revision status badges; revision articles sort to top
- **Tests:** `scan-api.spec.ts` (3), `scan-results.spec.ts` (6), `update-api.spec.ts` (5), `update-editor.spec.ts` (7), `update-intake.spec.ts` (6) — **27 tests**

### Phase 2 Sprint 3: Confidence Feedback Loop — COMPLETE

- **Approve API** (`/api/approve`) — Sets article status to "approved", extracts verified facts from content
- **Request Revision API** (`/api/request-revision`) — Sets status to "revision", removes verified facts, stores reason
- **Verified Facts Extractor** (`src/lib/verified-facts/extractor.ts`) — Parses bold elements, nav paths, buttons, filters, cards from How To steps
- **Verified Facts Store** (`src/lib/verified-facts/store.ts`) — Module-scoped fact storage with per-article entries (Vercel KV / local JSON)
- **Block Builder** (`src/lib/verified-facts/block-builder.ts`) — Builds VERIFIED FACTS prompt block from stored facts
- **Prompt injection** — Generate route fetches module facts, builds block, injects into How To + What's New prompts before INPUT section
- **Preview page Reviewer actions** — Approve/Request revision buttons on shared articles, success banners, approved/revision status display
- **Editor revision banner** — Shows Reviewer's revision reason when article is in revision status
- **Cross-module isolation** — Facts are scoped per module, no leakage between modules
- **Tests:** `approve.spec.ts` (6), `approve-ui.spec.ts` (8), `verified-facts.spec.ts` (7), `feedback-loop.spec.ts` (4) — **25 tests**

### Total Test Count — 165 tests (158 E2E + 7 unit)

| Spec file | Tests | Sprint | Coverage |
|---|---|---|---|
| `auth.spec.ts` | 6 | S1 | Login, password auth, redirect, preview access, session |
| `landing.spec.ts` | 6 | S1 | Empty state, cards, badges, new/update buttons, delete |
| `generate.spec.ts` | 6 | S1 | Intake form, validation, short-description warning, generation flow |
| `editor-howto.spec.ts` | 8 | S1 | How To editor: title, overview, steps, bold, screenshots, sidebar |
| `editor-whatsnew.spec.ts` | 7 | S1 | What's New editor: tabs, title, overview, sections, persistence |
| `flags.spec.ts` | 10 | S1 | Confidence flags: render, WHAT/WHY/ACTION, dismiss, sidebar, persistence |
| `regenerate.spec.ts` | 8 | S1 | Regenerate: modal, pre-fill, feedback, warning, cancel, replacement |
| `share.spec.ts` | 7 | S1 | Share: button, modal, preview URL, Reviewer note, save & copy |
| `preview.spec.ts` | 10 | S1 | Preview: banner, Reviewer label, content, steps, bold, screenshots |
| `thin-data.spec.ts` | 5 | S1 | Thin data: detection, banner, write-manually, regenerate, INSUFFICIENT CONTEXT |
| `scan-api.spec.ts` | 3 | S2 | Scan API: valid scan, no matches, missing fields |
| `scan-results.spec.ts` | 6 | S2 | Scan results: badges, checkboxes, update flow, landing badges |
| `update-api.spec.ts` | 5 | S2 | Update API: revised steps, isUpdate/originals, unchanged steps, errors |
| `update-editor.spec.ts` | 7 | S2 | Editor update indicators: teal border, badges, view original, banner |
| `update-intake.spec.ts` | 6 | S2 | Update intake: mode toggle, scan flow, checkboxes, update selected |
| `approve.spec.ts` | 6 | S3 | Approve API: status, facts stored, merge, revision, facts removal |
| `approve-ui.spec.ts` | 8 | S3 | Preview Reviewer actions, landing badges, editor revision banner |
| `verified-facts.spec.ts` | 7 | S3 | Extractor, API, feedback loop integration, empty module |
| `feedback-loop.spec.ts` | 4 | S3 | Full cycle, approve→revision, re-approve, cross-module isolation |
| `accessibility.spec.ts` | 20 | A11y | Axe-core audit (9 screens), keyboard navigation (11 tests) |
| `kanban.spec.ts` | 6 | Kanban | View toggle, columns, card placement, drag reorder, revision border, persistence |
| `landing-contextual.spec.ts` | 7 | Context | Empty/articles states, action cards, attention card, flag gating |
| `admin.spec.ts` | 6 | Admin | Admin login, flag toggle, flag gating, reset defaults |
| **Unit tests** | **7** | S1 | PII filter, article structure |
| **Total** | **165** | | |

## Phase 1 COMPLETE (2026-03-15)

All Phase 1 features are built, tested, and working. The full new-article flow (intake → generation → editing → share → print) is functional end-to-end.

### Phase 1 Summary — Features Shipped

1. **Article generation** — How To + What's New articles generated from feature specs via Anthropic Claude API
2. **VERIFIED INPUTS pattern** — Intelligent confidence flagging where the AI marks sections it's uncertain about
3. **Editor** — contenteditable text editing, screenshot placeholders, confidence flags with WHAT/WHY/ACTION detail
4. **Regenerate with pre-filled inputs** — Re-run generation from the editor; replaces article in place
5. **Thin data detection with recovery flow** — When specs are too sparse, offers Write manually + Regenerate options
6. **Share with Reviewer** — Preview URL + optional note sent to Reviewer for review
7. **Preview page** — Read-only HTML-rendered article with Reviewer note banner
8. **Loading screen** — Animated step indicators showing generation progress
9. **Update existing placeholder** — Phase 2 update mode visible with "Coming soon" state
10. **Delete articles** — Remove articles from landing page
11. **Sidebar** — Two zones (checklist + flags), tab badges, screenshot count, flag count

### Post-Build Fixes Applied

- Generate API parsing fixed (markdown fence stripping from Claude responses)
- Loading screen with animated steps added
- Backwards typing bug fixed (contenteditable + React re-render conflict)
- Confidence flag dismiss button fixed
- Regenerate button added to editor toolbar
- Thin-data handling with "write manually" recovery flow added
- Intake form validation warning for short descriptions added

### Known Issues / Post-Phase 1 Polish

- Delete button is hover-only (should always be visible)
- Writer assignment not implemented
- Terminology doc not yet uploaded
- Sidebar checklist scroll-to behavior not verified
- Thin-spec flag regression test needed

## Phase 2 Features Shipped

1. **Article scanning** — AI-powered scan to find articles affected by feature changes, confidence-ranked results (HIGH/MEDIUM/LOW)
2. **Article updates** — Generate revised articles preserving originals, teal change indicators, "View original" toggle
3. **Update intake mode** — Mode toggle, scan flow with checkboxes, batch update selected articles
4. **Approve flow** — Reviewer approves articles from preview page, extracts verified facts from content
5. **Request revision flow** — Reviewer requests revision with reason, removes verified facts, revision banner in editor
6. **Verified facts extraction** — Parses bold UI elements, navigation paths, buttons, filters, cards from approved articles
7. **Confidence feedback loop** — Approved article facts injected into subsequent generation prompts as VERIFIED FACTS block
8. **Cross-module fact isolation** — Facts scoped per module, no cross-contamination
9. **Landing page enhancements** — Contextual landing (empty state, action cards, attention card), status badges, revision sort
10. **Preview page Reviewer actions** — Approve + Request revision buttons, success banners, status displays
11. **Kanban board** — Drag-and-drop board view with @dnd-kit, three columns (To Do / In Progress / Complete), view toggle with localStorage persistence
12. **Admin dashboard** — Feature flag management with grouped toggles (Core Tools / Review Workflow), convenience buttons, stats
13. **Accessibility audit** — axe-core across 9 screens, keyboard navigation, zero critical violations

## Feature Flag Defaults

Feature flags are grouped into two categories:

**Core Tools** (default: ON): `confidenceFlags`, `regenerate`, `deleteArticles`, `reviewerNote`, `shareWithReviewer`

**Review Workflow** (default: OFF): `updateExisting`, `approveWorkflow`, `updateIndicators`, `completedSection`, `verifiedFacts`

Admin dashboard (`/admin/dashboard`) provides toggle management, "Enable Review Workflow" / "Disable Review Workflow" / "Enable all" convenience buttons, and "Reset to defaults".

## Branching Strategy

- **main** = production (Phase 2 complete, deployed to Vercel)
- **phase-2** = Phase 2 development branch (merged to main 2026-03-17)

### Known Issues / Post-Phase 2 Polish
- Stale results detection not implemented (deferred to Phase 3)
- Writer assignment not implemented
- Terminology doc not yet uploaded

### Accessibility Audit — COMPLETE (2026-03-16)

**Testing:** `@axe-core/playwright` installed. `accessibility.spec.ts` runs axe-core against 9 major screens and includes 11 keyboard navigation tests (20 tests total). Zero critical/serious violations. Moderate warnings (landmark-one-main, region, page-has-heading-one) are logged but do not fail tests.

**Axe violations found and fixed:**

| Category | Count | Fix |
|---|---|---|
| `select-name` (critical) | 6 | Added `htmlFor`/`id` to all select elements in intake, regenerate modals |
| `color-contrast` (serious) | 15+ | Darkened `--text-tertiary` (#9C9B97 → #5E5D5B), `--blue` (#378ADD → #1A5FA6), `--amber` (#BA7517 → #92610F); darkened preview banner, approve button |
| `nested-interactive` (serious) | 15 | Removed `role="button"` from article cards (kept tabIndex + keyboard handler) |
| Missing `aria-label` | 12 | Added to icon buttons, toolbar buttons, screenshot slots, dismiss button, nav back |
| Missing `role="dialog"` | 3 | Added `role="dialog"`, `aria-modal="true"`, `aria-labelledby` to all 3 modals |
| Missing focus management | 3 | Modals capture/restore focus on open/close via `previousFocusRef` |
| Missing Escape key | 3 | All modals close on Escape keypress |
| Missing `role="tablist"` | 2 | Added to mode toggle and sidebar type tabs with `role="tab"` + `aria-selected` |
| Missing `role="toolbar"` | 1 | Added to format toolbar with `aria-label="Text formatting"` |
| Missing `role="textbox"` | 7 | Added to all contentEditable sections with `aria-label` and `aria-multiline` |
| Missing `role="alert"` | 1 | Added to toast component with `aria-live="polite"` |
| Missing form labels | 3 | Added visually hidden labels for login password, revision reason textarea |
| Sidebar `opacity` | 1 | Increased completed item opacity from 0.55 to 0.7 for contrast compliance |

**Remaining warnings (moderate, non-failing):**
- `landmark-one-main` — Login, editor, preview pages lack `<main>` landmark (cosmetic)
- `region` — Some content outside landmark regions
- `page-has-heading-one` — Editor page has no h1 (uses toolbar title instead)

## Spec Compliance

- **article.ts** — All Phase 2 fields present (`isUpdate`, `updatedSteps`, `updateReason`, `originals`, `parentArticleIds`) with correct types. `FeatureIntake` includes `isUpdate` and `targetArticleIds`. `ScanResult` interface defined.
- **pii.ts** — `PIIFreePayload` includes all 3 scan-specific optional fields (`existingArticleContent`, `existingArticleOverview`, `existingArticleBoldElements`). `assertPIIFree` validates against `ALLOWED_FIELDS` set.
- **Prompts** — All 4 files exist with version constants and builder functions: `how-to.ts` (v0.2.0), `whats-new.ts` (v0.2.0), `scan-articles.ts` (v0.1.0), `update-how-to.ts` (v0.1.0).
- **Article CRUD** — `updateArticle` uses `Partial<Article>` spread, handles all fields. Generate route sets correct Phase 2 defaults.
- **Phase 1 features** — All 11 spec items complete (types, generation API, CRUD, landing, intake, editor, share/preview, auth, print CSS, tests, CLAUDE.md).
- **Phase 2 API routes** — `api/scan/route.ts`, `api/update/route.ts`, `api/approve/route.ts`, `api/request-revision/route.ts`, `api/verified-facts/route.ts` all implemented.
- **Phase 2 components** — Mode toggle logic is inline in `intake-form.tsx` rather than separate file. Scanner and comparison view are inline in their respective components.
