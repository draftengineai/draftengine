# GateDoc — AI-Powered Knowledge Center Documentation Engine

Generate, edit, and manage knowledge center articles from feature specs using AI.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-org%2Fgatedoc&env=ANTHROPIC_API_KEY,GATEDOC_PASSWORD,GATEDOC_ADMIN_PASSWORD&envDescription=API%20key%20for%20AI%20generation%2C%20writer%20password%2C%20and%20admin%20password&envLink=https%3A%2F%2Fgithub.com%2Fyour-org%2Fgatedoc%23configuration&project-name=gatedoc&repository-name=gatedoc)

<!-- TODO: Replace "your-org" in the deploy URL with the actual GitHub org/user once the repo is public. -->

---

## Features

- **AI Article Generation** — Enter a feature spec, get polished How To and What's New articles in seconds
- **Confidence Flags** — AI marks sections it's uncertain about with WHAT / WHY / ACTION detail so writers know exactly what to verify
- **Editorial Workflow** — Generate, edit, share with reviewers, approve or request revisions
- **Verified Facts Feedback Loop** — Approved article facts are fed back into future generation prompts, improving accuracy over time
- **Multi-Provider AI** — Anthropic Claude (default), OpenAI, or Ollama for fully local/private operation
- **Template System** — Swap writing standards, article structure, and terminology per deployment
- **Admin Dashboard** — Feature flag management, grouped toggles, convenience presets
- **Kanban Board** — Drag-and-drop board view for article workflow tracking
- **Markdown & HTML Export** — Copy articles as clean Markdown (for GitHub wikis, Notion) or HTML
- **Accessibility** — axe-core audited across 9 screens, keyboard navigable, zero critical violations
- **165+ Tests** — 158 E2E (Playwright) + 7 unit (Jest), all using mocked AI responses

## Quick Start

### Option A: Deploy to Vercel (recommended)

Click the **Deploy with Vercel** button above. You'll be prompted to set:

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key (`sk-ant-...`) |
| `GATEDOC_PASSWORD` | Shared password for writer login |
| `GATEDOC_ADMIN_PASSWORD` | Password for admin dashboard |

Vercel auto-generates `NEXTAUTH_SECRET` and sets `NEXTAUTH_URL`. Link a [Vercel KV](https://vercel.com/docs/storage/vercel-kv) store for persistent article storage (optional — falls back to local JSON).

### Option B: Local Development

```bash
# Clone and install
git clone https://github.com/your-org/gatedoc.git
cd gatedoc
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your values

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Configuration

### AI Provider

Set `AI_PROVIDER` to choose your AI backend:

| Provider | Env Var | Notes |
|---|---|---|
| `anthropic` (default) | `ANTHROPIC_API_KEY` | Claude Sonnet — best quality |
| `openai` | `OPENAI_API_KEY` | GPT-4o — requires `npm install openai` |
| `ollama` | `OLLAMA_BASE_URL`, `OLLAMA_MODEL` | Fully local, no API key needed |

### Templates

Set `GATEDOC_TEMPLATE` to switch documentation style:

| Template | Description |
|---|---|
| `default` | Knowledge center documentation — structured How To and What's New articles |
| `technical-docs` | Developer-focused — code examples, API references, release notes |

Templates define writing standards, article structure, and terminology. Create custom templates in `src/lib/config/templates/`.

### Feature Flags

Feature flags control which capabilities are enabled. Manage them from the admin dashboard (`/admin/dashboard`) or set defaults in `src/lib/config/features.ts`.

**Core Tools** (default ON): Confidence flags, regenerate, delete, reviewer notes, share

**Review Workflow** (default OFF): Update existing articles, approve workflow, update indicators, verified facts

### All Environment Variables

See [.env.example](.env.example) for the complete list with descriptions.

## Architecture

```
src/
├── app/                        # Next.js App Router
│   ├── page.tsx                # Landing — article list + kanban
│   ├── login/                  # Password gate
│   ├── editor/[id]/            # Editor workbench
│   ├── preview/[id]/           # Read-only preview (shareable)
│   ├── admin/dashboard/        # Feature flags + stats
│   └── api/
│       ├── generate/           # AI article generation
│       ├── scan/               # AI article impact scanner
│       ├── update/             # AI article revision
│       ├── approve/            # Reviewer approve flow
│       ├── request-revision/   # Reviewer revision request
│       └── verified-facts/     # Verified facts API
├── components/                 # React components
│   ├── article-canvas.tsx      # Main editor canvas
│   ├── export-menu.tsx         # HTML + Markdown export
│   ├── format-toolbar.tsx      # Bold, underline, undo/redo
│   ├── intake-form.tsx         # Feature spec intake
│   └── ...
├── lib/
│   ├── ai/
│   │   └── provider.ts         # Multi-provider AI abstraction
│   ├── config/
│   │   ├── features.ts         # Feature flags system
│   │   ├── terminology-seed.json
│   │   └── templates/          # Template system
│   │       ├── index.ts        # Template loader
│   │       ├── default/        # Default template
│   │       └── technical-docs/ # Dev-focused template
│   ├── prompts/                # Versioned AI prompts
│   ├── verified-facts/         # Feedback loop storage
│   └── db/
│       └── storage.ts          # Vercel KV / local JSON
└── middleware.ts               # Auth gate
```

## Testing

```bash
# E2E tests (Playwright)
npm test

# E2E with UI mode
npm run test:ui

# Unit tests (Jest)
npm run test:unit
```

All tests use mocked AI responses — no real API calls. Set `GATEDOC_PASSWORD=test` and `ANTHROPIC_API_KEY=test-key` when running tests.

## Tech Stack

- **Framework:** Next.js 14+ (App Router, TypeScript)
- **Styling:** Tailwind CSS + CSS variables
- **Auth:** Middleware password gate + NextAuth.js
- **Storage:** Vercel KV (production) / local JSON (dev)
- **AI:** Anthropic Claude, OpenAI, or Ollama
- **Testing:** Playwright (E2E) + Jest (unit)
- **Deployment:** Vercel

## License

[MIT](LICENSE)
