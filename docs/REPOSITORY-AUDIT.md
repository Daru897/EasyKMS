# Repository audit

Inspected starting commit: `4459c6f` on `master`. Original product: BPO knowledge management and agent assistance, branded IKMS/Knowbot/EasyKMS in different places.

## What was already present

The `knowbot-kms/` app used Next.js 16.1.1, React 19.2.3, Supabase, Pinecone, Inngest, OpenAI, Google Drive, and LlamaParse. It included document ingestion, governance routes, agent screens, analytics screens, SQL scripts, and extensive architecture documentation. This was not an obsolete framework rewrite problem; the main gaps were integration complexity, verifiable behavior, safe boundaries, and a coherent product experience.

## Findings from code and documentation

- Root README says roughly 65% complete, while `docs/00-PROJECT-OVERVIEW.md` claims 100%. Those percentages are not validation evidence.
- `knowbot-kms/app/api/query/route.ts` takes a tenant ID from `user.user_metadata` and falls back to the first active tenant. The approval route uses a similar fallback. User-controlled metadata and fallback tenant selection need a production authorization redesign.
- The query route uses a service client and an embedded relation tenant filter in keyword retrieval. This must be audited independently of row-level-security claims; service-role access bypasses those controls.
- Query request `topK` and `minScore` are client-controlled without strict bounded validation. Threshold language such as “zero hallucination” is not warranted by a similarity cutoff.
- Server cookie access in `utils/supabase/server.ts` mixes an asynchronous `cookies()` API with older cookie callback patterns. Update and verify the auth flow before reusing it.
- Root layout/middleware immediately depend on Supabase setup. The app cannot offer a credential-free visitor experience as written.
- Multiple services and loosely ordered SQL files increase setup and deployment burden. No verified end-to-end migration path was demonstrated in the repository.
- README requires Node 18+, whereas the framework’s documented minimum is Node 20.9. The new app standardizes on Node 24 because it uses built-in SQLite.
- No license is declared. Do not imply open-source reuse permissions until the owner chooses one.

These are targeted code-review findings, not a comprehensive penetration test. The legacy app was preserved and was not certified for production.

## Rebuild decision

Build the showcase in `web/`, retain old code and history, and switch root documentation to the new entrypoint. Preserve the product’s governance and knowledge-gap strengths while removing cloud credentials from the demo’s critical path.

A single persisted Node service makes the portfolio use case easy to run and inspect. It is not the recommended final multi-tenant SaaS architecture; see the production roadmap.

## Current technical references

- [Next.js installation and runtime requirements](https://nextjs.org/docs/app/getting-started/installation)
- [Next.js 16 upgrade guidance](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Supabase hybrid search: Postgres full-text plus pgvector](https://supabase.com/docs/guides/ai/hybrid-search)

Package versions were resolved from the npm registry and pinned during implementation. “Latest” dependencies are not left floating in the manifest.
