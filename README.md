# EasyKMS

**Clarity for every conversation.** A knowledge workspace for customer-support teams and BPOs: find approved policies, improve missing guidance, and publish with a traceable review workflow.

The modern portfolio release lives in **`web/`**. It runs without cloud credentials or paid AI services. The previous implementation remains in `knowbot-kms/` as historical reference; its setup and readiness claims do not apply to this release.

## Run locally

Requires **Node.js 24.x** (uses built-in SQLite).

```sh
cd web
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000) for the landing page or [/demo](http://localhost:3000/demo) for the sandbox. For a production build:

```sh
npm run build
HOSTNAME=127.0.0.1 PORT=3000 npm start
```

The production server runs from `.next/standalone`. The start wrapper keeps its database in `web/data/easykms.sqlite`, outside the build directory, so rebuilds preserve your workspace. Development uses the same default location. Set an absolute `DATABASE_PATH` to override it. Docker sets an absolute volume path automatically.

## New: public showcase and configurable team mode

- `/walkthrough`: guided interactive text tour.
- `/case-study`: portfolio product case study.
- `/setup`: first-run demo setup and Markdown/CSV draft import.
- `/team`: configurable Supabase Auth + managed Postgres workspaces, enforced roles, and email-bound invitations.
- `render.yaml`: Render deployment template, not yet deployed.
- Optional Google Drive draft imports and gated AI-assisted retrieval.

See [Team setup and integration limits](docs/TEAM-SETUP.md) for activation instructions. These cloud paths are implemented and locally tested, but hosted accounts and live provider behavior have not been validated. AI remains disabled pending a live evaluation.

## The two-minute demo

1. Ask **“What is our refund policy?”** View the direct excerpts and open their sources.
2. Ask **“Does the warranty cover accidental water damage?”** Watch the question become a knowledge gap.
3. Create a warranty policy in the library and submit the draft for review.
4. Approve and publish it in the review queue. Ask the question again.
5. Link the policy to the gap, mark it resolved, and inspect the activity and insights.

Every browser receives an independent demo workspace. Data persists on the server for seven days from first visit. Use fictional content; this is an anonymous showcase, not enterprise authentication.

## What works

- Responsive agent workspace with full-text search across approved, current policies.
- Source excerpts, policy metadata, feedback, and copy-to-clipboard.
- Policy creation, editing, review, changes requested, publishing, and archival.
- Draft revisions keep the current published version live until replacement is approved.
- Automatic knowledge gaps, duplicate request counts, and resolution linked to a policy.
- Real usage and feedback metrics, governance activity, JSON export, and workspace reset.
- Persistent SQLite storage, bounded anonymous sessions, input validation, origin checks, and rate limits.
- Automated workflow, API, browser, and accessibility checks.

Search is deliberately **extractive**. It retrieves policy text; it does not generate an LLM answer or claim answer correctness. English lexical retrieval has limits; see [architecture](docs/SHOWCASE-ARCHITECTURE.md).

## Stack

Next.js 16.4 · React 19.3 · TypeScript · Node.js 24 · SQLite FTS5 · Zod · Lucide · Playwright. Exact versions are pinned in `web/package.json` and its lockfile. No separate vector database, job service, auth account, or document parser is required for this demo.

## Deploy

```sh
# From repository root
docker compose up --build -d
```

Open [localhost:3000](http://localhost:3000). A named volume preserves the database. This release targets **one Node/container instance with persistent disk**, not an ephemeral serverless filesystem. Set `APP_ORIGIN` to the actual public HTTPS origin and `COOKIE_SECURE=true` behind a TLS reverse proxy.

Read the [deployment runbook](docs/DEPLOYMENT.md) before hosting. No cloud resources have been provisioned by this change.

## Verify

```sh
cd web
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

## Product and engineering context

- [Product brief and delivery roadmap](docs/PRODUCT-BRIEF.md)
- [Repository audit](docs/REPOSITORY-AUDIT.md)
- [Architecture and API](docs/SHOWCASE-ARCHITECTURE.md)
- [Deployment and operations](docs/DEPLOYMENT.md)
- [Validation results](docs/VALIDATION.md)
- [Team mode, imports, Drive, and AI setup](docs/TEAM-SETUP.md)

Legacy docs under `docs/00-*` through `docs/05-*`, `docs/archive/`, and the existing SQL files describe the prior cloud-dependent implementation. They have not been revalidated as production-ready.

## License

The repository does not currently declare a license. Choose one before offering reuse rights to third parties.
