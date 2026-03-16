# GateDoc

GateDoc is a Next.js application that generates Knowledge Center articles for Gate Access (a web application used by Jehovah's Witnesses to coordinate prison ministry work). Writers enter feature specs via an intake form, and the AI generates How To and What's New articles using the Anthropic Claude API. Writers then edit, add screenshots, share with Stewards, and print to PDF.

## Tech Stack

- **Framework:** Next.js 14+ (App Router, TypeScript, src directory)
- **Styling:** Tailwind CSS + custom CSS variables matching v8 mockup
- **Auth:** Auth.js (next-auth) with credentials provider, 3 hardcoded users
- **AI:** Anthropic SDK (@anthropic-ai/sdk) — Claude for article generation
- **Testing:** Jest (unit) + Playwright (E2E)
- **Deployment:** Vercel, project name "gatedoc"

## File Structure

```
src/
  app/
    page.tsx                        # Landing — article list
    layout.tsx                      # Root layout with auth provider
    editor/[id]/page.tsx            # Editor workbench
    preview/[id]/page.tsx           # Read-only preview
    api/
      auth/[...nextauth]/route.ts   # Auth.js
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
      articles.ts                   # Article CRUD — JSON file for MVP
tests/
  fixtures/
    ftr-3849-input.json
    pii-test-cases.json
    thin-data-input.json
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
```

## How to Test

```bash
npm test
npx playwright test
```

## Deployment

- Platform: Vercel
- Project name: `gatedoc`
- Environment variables must be set in Vercel dashboard

## Current Status — Phase 1 COMPLETE (2026-03-15)

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
