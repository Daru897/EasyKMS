# Showcase architecture

> This document records the original showcase scope. The subsequent configurable Postgres, authentication, team permissions, Drive ingestion, and optional AI implementation is documented in [Team setup](TEAM-SETUP.md).

## Runtime

Browser → Next.js app → one workspace API → domain actions → SQLite.

The app uses React and TypeScript for the interface, Next.js for rendering and request handling, Zod for bounded input validation, and Node 24’s built-in SQLite driver. SQLite FTS5 supplies ranked keyword retrieval. No external AI or cloud service receives visitor content.

`web/` is independently installable. The previous `knowbot-kms/` app is not imported, built, deployed, or used for authorization by the showcase.

## Storage and workspace boundaries

A cryptographically random 256-bit token in an HTTP-only, SameSite=Lax cookie identifies an anonymous sandbox. Server lookup—not a submitted tenant ID—determines the workspace. The cookie is a bearer credential, not a real user identity. HTTPS deployments must set `COOKIE_SECURE=true`.

SQLite stores each bounded workspace as JSON and maintains a workspace-scoped FTS index of published policies in a transaction. Every mutation reads the latest snapshot after parsing the asynchronous request body. Domain changes and persistence execute synchronously in one Node process. This supports the showcase scale; it is not a horizontally scaled data model.

Sessions expire seven days after creation. Expired rows become inaccessible immediately and are deleted along with search rows when a new workspace is created. Physical cleanup is opportunistic, not an exact-time deletion scheduler. Default maximum: 1,000 active workspaces; 100 policies per workspace; 1,000 recent searches; 200 recent gaps; 250 activity entries. Exports contain the retained workspace only. Anonymous session creation should additionally be protected by a reverse-proxy rate limiter on a public host.

The production container runs as a non-root user and stores the database in `/app/data` on a persistent volume. WAL and a busy timeout support normal local database access. Use one app instance. Database snapshots/backups must account for WAL; do not copy only the main file while writes are active.

## Governance

- Drafts can be edited and submitted.
- In-review policies can be published or returned for changes.
- Published policies are immutable. A revision creates a new draft referencing its predecessor.
- Publishing a revision archives its predecessor in the same saved transaction.
- Published policies can be archived; archived policies are not searchable.
- Overdue review dates exclude a policy from search and prevent new publication.
- Resolving a gap requires linking a current published policy.

The demo deliberately permits all governance actions in one sandbox. It records actions as demo activity, not verified approvals by separate people. Production separation of duties requires identity and role enforcement.

## Search behavior

Tokenize an English question, remove common stop words, normalize a small set of support synonyms, and search FTS5 with Porter stemming. Rank title, summary, and content with BM25 weights. Apply a conservative lexical overlap heuristic and publication/review-date checks, then return at most three full policy excerpts.

No model synthesizes prose. The interface calls results “direct policy excerpts” and warns that a matching source does not establish applicability. A no-match response records a knowledge gap. This avoids fabricated model answers but does not solve semantic understanding. Negation, multi-intent questions, other languages, and specialized vocabulary can still return poor matches or abstain incorrectly. The overlap heuristic is not a calibrated confidence score.

For production, replace this retrieval adapter with permission-filtered Postgres full-text + pgvector rank fusion and evaluate on real support questions before adding generation. Do not retain the old “zero hallucination” marketing claim.

## API

`GET /api/health`: confirms the database can be opened and queried. Returns 503 when unavailable.

`GET /api/workspace`: loads the cookie-bound sandbox or creates a seeded sandbox. Response is `{ state }`, with `Cache-Control: no-store`.

`POST /api/workspace`: JSON mutation with the exact application `Origin` header. Session required. Body bounded at 32 KB; per-workspace limit 60 requests/minute. Validation failures return 400, oversized payloads 413, incorrect content type 415, unknown owned resources 404, and origin failures 403. Returns `{ state, result?, articleId? }`.

| Action | Input beyond `action` | Effect |
| --- | --- | --- |
| `create` | `article` | Saves a draft |
| `update` | `id`, `article` | Edits a draft |
| `submit` | `id` | Sends draft to review |
| `publish` | `id` | Publishes reviewed policy |
| `reject` | `id` | Returns review to draft |
| `revise` | `id` | Creates draft revision of published policy |
| `archive` | `id` | Removes a published policy from retrieval |
| `query` | `question` | Retrieves excerpts and records usage/gaps |
| `feedback` | search `id`, `value` | Stores one mutable helpful/unhelpful rating |
| `resolve` | gap `id`, `articleId` | Links policy and closes gap |
| `reset` | — | Restores fictional seed data |

Article fields: `title` (160 chars), one of four `category` values, `summary` (300), `content` (20,000), and ISO `reviewDate`. Questions are limited to 600 characters. All content is rendered as text; HTML is not interpreted.

## Upgrade seams

- Domain behavior: `lib/actions.ts`.
- Persistence and lexical search: `lib/store.ts`.
- Shared contracts: `lib/types.ts`.
- API boundary, session handling, request limits: `app/api/workspace/route.ts`.
- Product interface: `components/workspace-app.tsx`.

Normalize the database before implementing real teams, document connectors, or large-scale ingestion. Introduce explicit identity and permission services rather than treating a demo cookie as authentication. Legacy SQL and integrations need fresh review before reuse.
