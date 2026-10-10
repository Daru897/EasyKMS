# Validation record

Validated locally on 10 October 2026 using Node 24.16.0.

| Check | Result |
| --- | --- |
| Next.js production/standalone build | Passed |
| TypeScript checks | Passed |
| ESLint | Passed |
| Prettier formatting | Passed |
| Domain/storage/import/permission/provider tests | 29 passed |
| Browser/API/accessibility scenarios | 6 passed |
| Separate process-restart persistence scenario | 1 passed |
| Production dependency audit | 0 known vulnerabilities reported |
| Docker image build | Not run: Docker is not installed in this environment |
| Remote CI | Configured, not run; changes have not been pushed |
| Offline retrieval evaluation | 12/12 passed; no model calls |
| Live cloud deployment | Skipped at user request; Render template supplied |
| Hosted authentication, Drive, and live AI | Not run; credentials and accounts not configured |

Browser coverage includes the full question → gap → draft → review → publish → search → resolve journey, feedback, refresh persistence, independent API sessions, cross-origin write rejection, oversized/invalid requests, desktop/mobile overflow, keyboard dialog dismissal, and WCAG A/AA automated checks across the main agent page, all management views, and the editor. Automated checks do not replace a complete manual accessibility audit.

A separate test starts the standalone server with a temporary database, saves a policy, stops the process, restarts with the same database, and verifies the policy remains available using the original session.

Screenshots: [desktop](showcase-desktop.png), [mobile](showcase-mobile.png).

The development-only lint advisory and its scope are recorded in [the deployment runbook](DEPLOYMENT.md). Legacy `knowbot-kms/` code was inspected but was not built, fixed, or certified by these checks.

Additional coverage includes public pages on desktop/mobile, automated accessibility checks, first-run setup, and Markdown import preview/commit. Team tests execute the SQL migration with PGlite (Postgres-compatible local testing), exercise cross-team isolation, email-bound single-use invitations, role restrictions, self-approval prevention, access revocation, and Drive draft revisions. They do not establish hosted Postgres or real OAuth behavior. Provider response tests use mocks.

Landing screenshots: [desktop](landing-desktop.png), [mobile](landing-mobile.png). See [team activation and remaining live checks](TEAM-SETUP.md).
