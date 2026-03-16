# GateDoc

GateDoc is a Next.js application that generates Knowledge Center articles for Gate Access (a web application used by Jehovah's Witnesses to coordinate prison ministry work). Writers enter feature specs via an intake form, and the AI generates How To and What's New articles using the Anthropic Claude API. Writers then edit, add screenshots, share with Stewards, and print to PDF.

## Tech Stack

- **Framework:** Next.js 14+ (App Router, TypeScript, src directory)
- **Styling:** Tailwind CSS + custom CSS variables matching v8 mockup
- **Auth:** Simple password gate via middleware (env var `GATEDOC_PASSWORD`) + Auth.js (next-auth) for user identity
- **Persistence:** Vercel KV in production, local `store.json` fallback in dev
- **AI:** Anthropic SDK (@anthropic-ai/sdk) — Claude for article generation
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
    login/page.tsx                  # Password gate login page
    api/
      auth/route.ts                 # POST — simple password auth
      auth/[...nextauth]/route.ts   # Auth.js (user identity)
      generate/route.ts             # POST — new article generation
      articles/route.ts             # GET all, POST new
      articles/[id]/route.ts        # GET one, PATCH update
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
    generation-loading.tsx
  lib/
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
    db/
      storage.ts                    # Article CRUD — Vercel KV (prod) / store.json (dev)
      articles.ts                   # Legacy sync CRUD (kept for reference)
tests/
  fixtures/
    ftr-3849-input.json
    pii-test-cases.json
    thin-data-input.json
    mock-anthropic.ts              # Mock Anthropic API / generate route for E2E
    mock-article.ts                # Pre-built Article objects for editor tests
    sample-intake.ts               # FTR #3849 FeatureIntake data
  e2e/
    writer-journey.spec.ts
  unit/
    pii-filter.test.ts
    article-structure.test.ts
```

## Key Constraints

- **PIIFreePayload**: Every payload sent to Anthropic MUST be typed as PIIFreePayload. No PII (user names, facility names, resident names, IDs) ever reaches the API.
- **Terminology**: Organization-specific terms loaded from `src/lib/config/terminology-seed.json`. Non-negotiable usage rules.
- **Prompts**: Versioned in `src/lib/prompts/`. Each prompt file has a version constant and a builder function.
- **Phase 2 fields in data model**: Article type includes `isUpdate`, `updatedSteps`, `updateReason`, `originals`, `parentArticleIds` from day one — all default to empty/false/null.
- **Phase 2 UI/routes deferred**: No update mode in intake, no scan API, no revision API, no comparison view.

## How to Run

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Required environment variables (.env.local):
ANTHROPIC_API_KEY=sk-ant-...
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
GATEDOC_PASSWORD=<shared demo password>

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
| `share.spec.ts` | 7 | Share button, modal, preview URL, Steward note, save & copy, cancel |
| `preview.spec.ts` | 10 | Preview banner, Steward label, article content, steps, bold, screenshots, no raw HTML, Steward note, no-auth access |
| `thin-data.spec.ts` | 5 | Thin data detection, banner, write-manually recovery, regenerate from thin, INSUFFICIENT CONTEXT display |

### Test Fixtures (tests/fixtures/)

- **mock-anthropic.ts** — Intercepts Anthropic API / `/api/generate` calls with deterministic responses. Provides `mockAnthropicApi(page)` for upstream interception and `mockGenerateApi(page)` for route-level interception.
- **mock-article.ts** — Pre-built `Article` objects: `mockGeneratedArticle`, `mockEditingArticle`, `mockSharedArticle`. How To has 5 steps with 1 confidence flag on step 3; What's New has all 4 sections.
- **sample-intake.ts** — FTR #3849 `FeatureIntake` data (`ftr3849Intake`): "Search Criteria for Volunteers", module Volunteers, 2 user stories.

## Deployment

- Platform: Vercel
- Project name: `gatedoc`
- Environment variables must be set in Vercel dashboard

## Current Status — Phase 2 IN PROGRESS (2026-03-16)

### Phase 2 Sprint 1: Regression Test Infrastructure — COMPLETE (2026-03-16)

- **73 E2E tests** across 10 spec files — all passing
- Playwright config: `testDir: ./tests/e2e`, `retries: 1`, Chromium only, dev server auto-start
- Test fixtures: `mock-anthropic.ts`, `mock-article.ts`, `sample-intake.ts`
- Package scripts: `test` → Playwright, `test:ui` → Playwright UI, `test:unit` → Jest
- GitHub Actions CI: `.github/workflows/test.yml` — runs on push to main/phase-2 and PRs to main
- All tests use mocked API responses — no real Anthropic calls

## Phase 1 COMPLETE (2026-03-15)

All Phase 1 features are built, tested, and working. The full new-article flow (intake → generation → editing → share → print) is functional end-to-end.

### Phase 1 Summary — Features Shipped

1. **Article generation** — How To + What's New articles generated from feature specs via Anthropic Claude API
2. **VERIFIED INPUTS pattern** — Intelligent confidence flagging where the AI marks sections it's uncertain about
3. **Editor** — contenteditable text editing, screenshot placeholders, confidence flags with WHAT/WHY/ACTION detail
4. **Regenerate with pre-filled inputs** — Re-run generation from the editor; replaces article in place
5. **Thin data detection with recovery flow** — When specs are too sparse, offers Write manually + Regenerate options
6. **Share with Steward** — Preview URL + optional note sent to Steward for review
7. **Preview page** — Read-only HTML-rendered article with Steward note banner
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
- Accessibility keyboard navigation audit needed
- Thin-spec flag regression test needed

## Phase 2 Readiness

- Data model includes Phase 2 fields (`isUpdate`, `updatedSteps`, `updateReason`, `originals`, `parentArticleIds`) with defaults
- Scan articles prompt exists in `src/lib/prompts/scan-articles.ts` (v0.1.0)
- Update How To prompt exists in `src/lib/prompts/update-how-to.ts` (v0.1.0)
- Confidence feedback loop architecture documented
- Update existing UI placeholder ready to be activated

## Branching Strategy

- **main** = stable demo (Phase 1 complete, deployed to Vercel)
- **phase-2** = active development
- All Phase 2 work happens on the `phase-2` branch
- Merge to `main` only when Phase 2 is demo-ready

## Phase 1 vs Phase 2 Boundary

### Phase 1 (current sprint):
New article flow: intake → generation → editing → share → print

### Phase 2 (deferred):
- Update existing article mode in intake modal
- AI article scanning (`api/scan/route.ts`)
- Revision prompt (`update-how-to.ts` usage)
- Comparison view in editor (teal borders, View original)
- Stale results detection
- `api/revise/route.ts`

## Spec Compliance (vs implementation-kickoff-v2.md)

Audited 2026-03-15. Reference spec: `implementation-kickoff-v2.md` in project root.

### Matches spec

- **article.ts** — All Phase 2 fields present (`isUpdate`, `updatedSteps`, `updateReason`, `originals`, `parentArticleIds`) with correct types. `FeatureIntake` includes `isUpdate` and `targetArticleIds`. `ScanResult` interface defined.
- **pii.ts** — `PIIFreePayload` includes all 3 scan-specific optional fields (`existingArticleContent`, `existingArticleOverview`, `existingArticleBoldElements`). `assertPIIFree` validates against `ALLOWED_FIELDS` set.
- **Prompts** — All 4 files exist with version constants and builder functions: `how-to.ts` (v0.2.0), `whats-new.ts` (v0.2.0), `scan-articles.ts` (v0.1.0), `update-how-to.ts` (v0.1.0).
- **Article CRUD** — `updateArticle` uses `Partial<Article>` spread, handles all fields. Generate route sets correct Phase 2 defaults.
- **Phase 1 features** — All 11 spec items complete (types, generation API, CRUD, landing, intake, editor, share/preview, auth, print CSS, tests, CLAUDE.md).

### Intentional divergences

- **Intake modal update mode** — Spec defers update mode UI to Phase 2, but the modal now opens in update mode with a "Coming soon" placeholder when clicking "Update existing" on the landing page. This is a UX improvement over the original toast-only behavior — the mode toggle is visible so users understand both modes exist.
- **Phase 2 API routes not created** — `api/scan/route.ts` and `api/revise/route.ts` do not exist as files yet. The spec lists them in the file structure but they are Phase 2 deliverables.
- **Phase 2 components not created** — `mode-toggle.tsx`, `article-scanner.tsx`, `step-comparison.tsx` do not exist. Mode toggle logic is inline in `intake-form.tsx`. Scanner and comparison are Phase 2.
- **Phase 2 test fixtures** — `ftr-3126-update-input.json`, `update-journey.spec.ts`, `scan-matching.test.ts` do not exist yet (Phase 2).
- **Regenerate modal** — `regenerate-modal.tsx` exists but is not listed in the spec file structure. Added post-spec as a UX enhancement.
- **Toast component** — `toast.tsx` exists but is not listed in the spec. Added for user feedback.
- **Generation loading** — `generation-loading.tsx` exists but is not in the spec file structure. Added to match v8 mockup loading screen.
