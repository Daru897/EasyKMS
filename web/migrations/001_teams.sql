CREATE SCHEMA IF NOT EXISTS easykms;
REVOKE ALL ON SCHEMA easykms FROM PUBLIC;
CREATE TABLE IF NOT EXISTS easykms.teams (
 id uuid PRIMARY KEY, name text NOT NULL, state jsonb NOT NULL,
 revision integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS easykms.members (
 team_id uuid NOT NULL REFERENCES easykms.teams(id) ON DELETE CASCADE,
 user_id uuid NOT NULL, email text NOT NULL,
 role text NOT NULL CHECK(role IN ('owner','editor','reviewer','agent')),
 PRIMARY KEY(team_id,user_id)
);
CREATE TABLE IF NOT EXISTS easykms.invitations (
 token_hash text PRIMARY KEY, team_id uuid NOT NULL REFERENCES easykms.teams(id) ON DELETE CASCADE,
 email text NOT NULL, role text NOT NULL CHECK(role IN ('editor','reviewer','agent')),
 expires_at timestamptz NOT NULL, used_at timestamptz
);
CREATE TABLE IF NOT EXISTS easykms.connections (
 team_id uuid NOT NULL REFERENCES easykms.teams(id) ON DELETE CASCADE,
 user_id uuid NOT NULL, encrypted_tokens text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(team_id,user_id), FOREIGN KEY(team_id,user_id) REFERENCES easykms.members(team_id,user_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS easykms.request_limits (
 user_id uuid PRIMARY KEY, window_start bigint NOT NULL, count integer NOT NULL
);
CREATE TABLE IF NOT EXISTS easykms.audit (
 id uuid PRIMARY KEY, team_id uuid NOT NULL REFERENCES easykms.teams(id) ON DELETE CASCADE,
 actor_id uuid NOT NULL, action text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS members_by_user ON easykms.members(user_id);
CREATE INDEX IF NOT EXISTS audit_by_team ON easykms.audit(team_id,created_at);
REVOKE ALL ON ALL TABLES IN SCHEMA easykms FROM PUBLIC;
-- This private schema is accessed only by the trusted server connection.
-- Do not expose it through the Supabase Data API or grant access to anon/authenticated.
