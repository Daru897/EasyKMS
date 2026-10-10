# Deployment and operations

## Supported deployment shape

One Node 24 service with a persistent local disk. The repository includes a production standalone build, Dockerfile, Compose configuration, health endpoint, and CI checks. It does not provision a domain or cloud account.

SQLite data must persist across restarts. An ephemeral serverless filesystem (including a default Vercel deployment) is not supported by this version. A future Postgres adapter can remove this constraint.

## Local production preview

```sh
cd web
npm ci
npm run build
DATABASE_PATH=/absolute/writable/path/easykms.sqlite HOSTNAME=127.0.0.1 PORT=3000 npm start
```

Visit `http://127.0.0.1:3000`. The build copies static assets into `.next/standalone`; the start wrapper runs that server and keeps the default database in `web/data/`, outside the build output. Development and local production share this default database. Use a full absolute path to choose a different location.

For development, `npm run dev` is enough. No `.env` file is required. Optional settings are documented in `web/.env.example`.

## Docker on a server

```sh
# Repository root
APP_ORIGIN=http://localhost:3000 docker compose up --build -d
curl --fail http://localhost:3000/api/health
```

The `easykms-data` named volume persists `/app/data`. Stopping or replacing the container keeps it. Deleting the volume deletes all demo workspaces.

For a public hostname:

1. Put a TLS reverse proxy in front of port 3000; restrict direct network access to that port.
2. Set `APP_ORIGIN=https://your-exact-hostname` with no trailing slash and `COOKIE_SECURE=true`.
3. Recreate the service with those values. Use only that browser hostname; origin validation intentionally rejects alternatives.
4. Add edge request/session-creation rate limiting, reasonable request body limits, and basic traffic monitoring.
5. Test the full create → review → publish → search journey through the public URL, not just localhost.
6. Confirm persistence across a container restart and run a backup/restore rehearsal before relying on the disk.

The app deliberately has no cross-origin API support. `APP_ORIGIN` avoids trusting proxy-derived host headers for write authorization. A public anonymous demo is not suitable for customer PII or internal policies.

## Settings

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_PATH` | `web/data/easykms.sqlite` via start wrapper | Absolute persistent location recommended; container sets `/app/data/easykms.sqlite` |
| `APP_ORIGIN` | request URL origin | Set explicitly behind a reverse proxy |
| `COOKIE_SECURE` | `false` | Must be `true` for public HTTPS |
| `MAX_DEMO_WORKSPACES` | `1000` | Bounded active sandbox capacity |
| `HOSTNAME` | standalone server default | Set `0.0.0.0` for containers or `127.0.0.1` locally |
| `PORT` | `3000` | HTTP listen port |

## Health and recovery

`/api/health` returns `{"status":"ok","service":"easykms","mode":"showcase"}` when SQLite is accessible. Docker checks it every 30 seconds. Health does not validate the entire browser workflow.

For a reliable backup, stop the service, copy the database directory including any WAL/SHM files to protected storage, and restart. Restore into a stopped service with the same file ownership. Never put a live SQLite database on a shared network filesystem or run multiple app replicas against this storage arrangement.

Expired sessions are denied after seven days; physical deletion occurs on subsequent workspace creation. If strict time-bound erasure is required, add a scheduled cleanup job before using real data. Demo activity is not an immutable compliance audit log.

## Rollout and rollback

Build and test an image before replacing the running service. Tag releases and retain the previous image plus a stopped-service database backup. This initial schema has no destructive migrations. Future schema changes need a migration version table, forward/backward compatibility planning, and restore tests.

## Quality gates

```sh
cd web
npm ci
npm run lint
npm run format:check
npm run typecheck
npm test
npm audit --omit=dev --audit-level=high
npm run build
npx playwright install chromium
npm run test:e2e
```

The GitHub workflow runs these checks and a container build. Browser reports are retained on failure. A green configured workflow is not a claim that a remote CI run has already occurred.

## Dependency audit note

At implementation time, npm reported five high-severity entries in the **development-only** Next.js ESLint dependency chain, rooted in `braces` (GHSA-vfj7-8cjw-p6xm). npm suggested downgrading `eslint-config-next` across major versions; that is not an appropriate automatic fix for the current framework. Production dependencies are checked separately. Recheck the advisory before release and update the compatible lint toolchain when an upstream fix is available. The runtime container copies only the standalone application, not the development toolchain.

## Render template added

`render.yaml` at the repository root defines a Docker web service, one instance, a 1 GB persistent disk mounted at `/app/data`, health checks, and secure cookies. It uses a paid Starter plan. Creating the Blueprint is a billable hosting action; nothing was provisioned during this task.

After the branch is pushed, create a Render Blueprint from that branch. Supply `APP_ORIGIN` as the exact HTTPS browser origin with no trailing slash. If Render assigns a different hostname, update this value before using mutation flows. Verify volume ownership allows the non-root `node` user to write `/app/data`; an image-layer directory permission does not guarantee every host’s mounted-volume ownership. The template has not been exercised on a live Render account.

The Blueprint enables the anonymous demo and public pages. For authenticated teams, add the settings described in [Team setup](TEAM-SETUP.md), then apply the private-schema migration before enabling the health check on that configuration. The runtime container includes `scripts/migrate.mjs` and the SQL migration; invoke `node scripts/migrate.mjs` with the server database configuration. Migration execution is explicit, never automatic against an unknown database.
