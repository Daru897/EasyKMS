# EasyKMS product brief

> This document records the original showcase scope. The subsequent configurable Postgres, authentication, team permissions, Drive ingestion, and optional AI implementation is documented in [Team setup](TEAM-SETUP.md).

Decision date: 10 October 2026. Audience and release objective confirmed with the owner: customer-support/BPO teams; a polished portfolio demo with a path to production.

## Positioning

EasyKMS is the place a support agent goes to find approved guidance—and the place a knowledge manager goes to learn what guidance is missing. Its differentiation is the feedback loop between answers and governed knowledge, not a generic chatbot.

**Product promise:** Find the right policy, understand its source, and make the next answer better.

## Users and jobs

| User | Job | Evidence of success |
| --- | --- | --- |
| Support agent | Resolve a customer question without hunting through documents | Finds a relevant, current policy and can inspect its source |
| Knowledge editor | Turn recurring unanswered questions into useful guidance | Creates a policy directly from an identified gap |
| Reviewer/team lead | Prevent unapproved or outdated guidance from reaching agents | Reviews a draft and controls when it becomes searchable |
| Operations lead | Identify where the knowledge process needs attention | Sees unanswered searches, overdue review dates, and feedback |

The demo lets a visitor act as both editor and reviewer to experience the full workflow. This is explicit demo behavior, not role-based authorization.

## First-release scope and acceptance criteria

1. A visitor can start without signup, API keys, or service configuration.
2. Search returns direct excerpts and source metadata from published, non-overdue policies only.
3. A missing answer records a knowledge gap; repeated identical questions increment demand.
4. Policies move through Draft → In review → Published → Archived. Requested changes return to Draft.
5. A revision leaves the existing published version accessible until the replacement is approved.
6. A manager can link a published policy to resolve a gap.
7. Changes survive browser refreshes and server restarts when the database disk persists.
8. Separate anonymous visitors cannot read or mutate each other’s workspace through the API.
9. Charts report actual workspace events, with empty states instead of invented KPI values.
10. The app is usable on mobile and with keyboard navigation and passes automated accessibility checks.

## Explicit non-goals for this release

Production customer records, enterprise identity, regulated-data controls, automatic Google Drive sync, PDF/OCR ingestion, semantic/LLM answers, historical point-in-time retrieval, CRM writeback, SSO, billing, and multilingual search. Existing legacy code for some of these is reference material, not silently connected to the new release.

## Design direction

A calm, editorial workspace: warm neutral surfaces, forest-green actions, restrained status colors, clearly separated sources, and the shortest possible path from question to useful guidance. Keep technical implementation details out of agent workflows; disclose demo limits in the guide and workspace settings.

## Measures

Current demo measures: number of questions, percentage with retrieved sources, positive-feedback share among rated questions, resolved gaps, and policies overdue for review. Search coverage is not answer accuracy. Seeded example gap counts are visibly fictional and excluded from search denominators.

Pilot measures, once instrumentation and baseline exist: expert-rated relevance/citation validity, unsupported-answer rate, median time to verified answer, review turnaround, knowledge-gap resolution time, and weekly agent adoption. Set targets only after collecting an agreed baseline; no invented savings claims.

## Production roadmap, ordered by dependency

### 1. Establish a real tenant boundary

Add managed identity, server-verified organization memberships, database-enforced access policies, editor/reviewer roles, invitation and revocation, audit retention, and account deletion. Anonymous sandbox data must never mix with pilot tenants. Gate: automated cross-tenant tests for every endpoint plus a reviewed permission matrix.

### 2. Consolidate persistent knowledge

Move JSON workspace storage to normalized Postgres tables for organizations, memberships, documents, versions, approvals, chunks, queries, feedback, and gaps. Adopt SQL migrations and backup/restore verification. Add tenant-qualified keys, one-live-version constraints, optimistic concurrency, and pagination. Gate: staging migration and restore rehearsal.

### 3. Add trustworthy ingestion

Manual text first; then Google Drive with least-privilege OAuth, encrypted token storage, idempotent jobs, checksums, retries, deletion propagation, parser isolation, and review-before-publication. Gate: integration tests for revoked OAuth, deleted sources, duplicate events, and partial failures.

### 4. Add evaluated hybrid retrieval and optional generation

Use Postgres full-text search plus pgvector and rank fusion. Filter by access, publication status, and effective/review dates before retrieval. Introduce a curated question set covering negatives, policy changes, conflicting policies, and injection attempts. Add an optional model adapter only after citation and abstention evaluations pass. Models see approved source chunks as data and must never invoke actions from source instructions. Measure latency and cost rather than assuming that “latest model” means better.

### 5. Operate a controlled pilot

Add observability, error budgets, durable rate limits, abuse protection, accessible review flows, legal/privacy review appropriate to actual data, and rollout/rollback procedures. Run with a small support team before adding integrations or multilingual claims.

These are ordered backlog slices, not time or cost estimates. Hosting provider, expected traffic, real content types, identity provider, and model budget remain open production decisions.
