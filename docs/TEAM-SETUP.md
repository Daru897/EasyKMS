# Team mode, Drive ingestion, and optional AI

Implemented locally; cloud activation was explicitly deferred by the owner. This guide describes configuration, not evidence that hosted accounts have been created or verified.

## Separate modes

- `/` — public landing page.
- `/demo` — anonymous, isolated SQLite sandbox with fictional sample data and seven-day expiry.
- `/setup` — name the demo workspace and preview/import Markdown or CSV drafts.
- `/walkthrough` — interactive text walkthrough.
- `/case-study` — public product case study.
- `/team` — real email sign-in, empty workspaces, managed Postgres persistence, team roles, and invitations. No demo expiry or seeded policies.

Team mode requires three server settings: `DATABASE_URL`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY`. The public key must be a Supabase **anon/publishable key**, never a service-role/secret key. The database can be Supabase Postgres or another managed Postgres service. Supabase supplies authentication; it does not have to host the application database.

## Configure managed Postgres and sign-in

1. Provision a managed Postgres database and a Supabase Auth project when ready.
2. Set the three environment variables above. Use a server-only database connection with access to the `easykms` schema. TLS is required by default; `DATABASE_SSL=disable` exists only for local tests/development.
3. Run `npm run migrate` from `web/` using that connection. The idempotent migration creates a private `easykms` schema. Never expose it through the Supabase Data API or grant it to anonymous/authenticated browser roles.
4. In Supabase Auth, configure the application Site URL and allow the exact `/team` redirect URL for each intended deployment. Keep email confirmation enabled. Configure an email sender suitable for your pilot; provider defaults may limit delivery.
5. Run `npm run check:config`. It reports missing variable names without printing secrets.
6. Open `/team`, request an email sign-in link, verify the address, and create an empty workspace.
7. Invite a second person as reviewer. Invitations return single-use tokens bound to the invited email, valid for seven days. Share them through your chosen channel; the app does not send invitation emails automatically.

The API verifies the bearer token against Supabase Auth for every request and requires a confirmed email. It never trusts browser-provided user IDs, roles, or editable user metadata. Membership is checked on each operation. Postgres row locks serialize workspace mutations and member removal. The server database credential is trusted; the browser never receives it.

## Permissions

| Action | Owner | Editor | Reviewer | Agent |
| --- | --- | --- | --- | --- |
| Search published/current policies, rate own searches | Yes | Yes | Yes | Yes |
| Read drafts and governance information | Yes | Yes | Yes | No |
| Create, edit, revise, import, submit | Yes | Yes | No | No |
| Approve, request changes, archive | Yes | No | Yes | No |
| Resolve knowledge gaps | Yes | Yes | Yes | No |
| Invite/remove members | Yes | No | No | No |
| Approve own policy | No | No | No | No |

Owners cannot remove themselves in this release. Role changes use remove/reinvite; ownership transfer and workspace deletion are future administrative features. Removing a member revokes app access and stored Drive credentials, and cancels that member’s outstanding invitations.

Workspace content remains a bounded JSONB aggregate (100 policies), with relational teams, members, invitations, encrypted connections, request limits, and audit events. This provides transactional persistence and permissions, but is not a normalized, large-document search platform. Keep the pilot small; use a migration before raising these limits.

## Markdown / CSV imports

Use `/setup` for the demo or the team’s Imports & Drive view. Markdown uses its first H1 as the title. CSV requires `title,content`; optional columns are `category,summary,reviewDate`. Allowed categories are the current four product collections. Samples are available at `/samples/policies.csv` and `/samples/policy.md`.

Files are limited to 24 KB, at most 50 rows, and the workspace cap of 100 policies. The request payload is also bounded. Preview does not write. Imports are all-or-nothing, reject duplicate active titles, and create only drafts. HTML/Markdown is displayed as plain text, not executed. Missing review dates default to 90 days.

## Google Drive ingestion

1. Configure the Google provider in Supabase Auth with your Google OAuth application, and enable the Drive API for that application.
2. Configure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` on the application server using that same application.
3. Generate `TOKEN_ENCRYPTION_KEY` using `openssl rand -hex 32` and store it as a server secret. Back it up securely; rotating it without a migration makes existing connections unreadable.
4. An editor selects Connect Google Drive, completes Google consent through Supabase, reopens the intended workspace, and selects Save Google connection. Access is stored for that member in that workspace.
5. Browse eligible files and explicitly import a selected source.

Scope: `drive.readonly`. This permits reading files the account can access; it is broader than a selected-file-only Picker flow and may require Google verification before external rollout. The UI asks for consent explicitly. Only Google Docs and plain-text/Markdown files are imported. Tokens are AES-256-GCM encrypted and cryptographically bound to team + member. Refresh access is attempted when necessary; revoked credentials require reconnection.

Ingestion is **manual and on demand**, with paginated browsing, bounded downloads, duplicate hashes, and draft revisions. It does not run scheduled sync, recurse folders, parse PDF/DOCX, or automatically propagate source deletions. Unchanged sources are skipped; changed sources with unfinished reviews are blocked; changes to published sources create a draft revision while the published version remains intact. Disconnect deletes locally stored credentials; Google Account settings can revoke the grant itself.

## Optional evaluated AI path

Baseline team retrieval is local English lexical matching. Optional AI uses the Responses API to generate bounded query paraphrases, fuses their lexical result rankings, and produces a structured cited summary over the top approved sources. It is **AI-assisted lexical retrieval, not an embedding/pgvector implementation**.

The adapter validates citation indices and exact evidence quotes, rejects incomplete/provider-error responses, and rechecks membership and source publication after the model call. Exact-quote validation is not proof that every generated claim follows from the evidence. The UI labels the summary as generated and asks users to verify it.

1. Run `npm run eval` for the deterministic offline fixture set. No API key or paid call is used.
2. Set `OPENAI_API_KEY` and an explicitly selected `AI_MODEL` supporting Responses structured outputs.
3. Run `npm run eval:live`. This sends fictional fixture data and incurs model usage. Review `evals/live-report.json` for retrieval results, responses, and failures.
4. Expand fixtures with representative policies and negatives; have a reviewer assess factual correctness, contradiction handling, missing citations, abstention, and source-injection attempts. The automated fixture set is intentionally small and is not a production quality claim.
5. Only after approving those results, set `AI_EVALUATION_APPROVED=true`. The normal endpoint and UI remain disabled otherwise. This is an operator-controlled release gate, not automatic certification.

No live model evaluation was run for this change. No paid model request was made. AI is never invoked by the public anonymous demo. Per-user requests are bounded, but the deployment also needs provider spending limits and monitoring before public team signup.

## Remaining live checks

Verify hosted TLS, database migrations, actual magic-link delivery/redirects, two real user roles, Google consent/refresh/revocation, persistent-disk permissions, and actual model behavior. Local Postgres-compatible and mocked-provider tests do not replace these checks.

Official references: [Supabase getUser](https://supabase.com/docs/reference/javascript/auth-getuser), [Google sign-in](https://supabase.com/docs/guides/auth/social-login/auth-google), [Drive download/export](https://developers.google.com/workspace/drive/api/guides/manage-downloads), [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses).
