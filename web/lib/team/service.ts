import { randomBytes, randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import { actionSchema, applyAction } from "../actions";
import { AppError } from "../store";
import { retrieve } from "../retrieval";
import type { Workspace } from "../types";
import type { Identity } from "./auth";
import type { Database } from "./database";
import { authorize, visibleState, type Role } from "./permissions";
export const teamActionSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("create"),
    name: z.string().trim().min(1).max(80),
  }),
  z.object({
    operation: z.literal("mutate"),
    teamId: z.uuid(),
    input: actionSchema,
  }),
  z.object({
    operation: z.literal("invite"),
    teamId: z.uuid(),
    email: z.email(),
    role: z.enum(["editor", "reviewer", "agent"]),
  }),
  z.object({
    operation: z.literal("join"),
    token: z.string().regex(/^[a-f0-9]{64}$/),
  }),
  z.object({
    operation: z.literal("remove"),
    teamId: z.uuid(),
    userId: z.uuid(),
  }),
]);
export type TeamAction = z.infer<typeof teamActionSchema>;
type TeamRow = { id: string; name: string; state: Workspace; revision: number };
export async function withTeam<T>(
  db: Database,
  user: Identity,
  teamId: string,
  work: (tx: Database, team: TeamRow, role: Role) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    const team = (
      await tx.query<TeamRow>(
        "SELECT * FROM easykms.teams WHERE id=$1 FOR UPDATE",
        [teamId],
      )
    )[0];
    const membership = (
      await tx.query<{ role: Role }>(
        "SELECT role FROM easykms.members WHERE team_id=$1 AND user_id=$2",
        [teamId, user.id],
      )
    )[0];
    if (!team || !membership) throw new AppError("Workspace not found.", 404);
    return work(tx, team, membership.role);
  });
}
export async function listTeams(db: Database, user: Identity) {
  return db.query<{ id: string; name: string; role: Role }>(
    "SELECT t.id,t.name,m.role FROM easykms.teams t JOIN easykms.members m ON m.team_id=t.id WHERE m.user_id=$1 ORDER BY t.created_at",
    [user.id],
  );
}
export async function readTeam(db: Database, user: Identity, teamId: string) {
  return withTeam(db, user, teamId, async (tx, team, role) => ({
    state: visibleState(team.state, role, user.id),
    role,
    revision: team.revision,
    members:
      role === "owner"
        ? await tx.query<{ user_id: string; email: string; role: Role }>(
            "SELECT user_id,email,role FROM easykms.members WHERE team_id=$1",
            [teamId],
          )
        : [],
  }));
}
export async function saveTeam(
  tx: Database,
  team: TeamRow,
  state: Workspace,
  user: Identity,
  action: string,
) {
  await tx.query(
    "UPDATE easykms.teams SET state=$1::jsonb, name=$2, revision=revision+1 WHERE id=$3",
    [JSON.stringify(state), state.profile?.name || team.name, team.id],
  );
  await tx.query(
    "INSERT INTO easykms.audit(id,team_id,actor_id,action) VALUES($1,$2,$3,$4)",
    [randomUUID(), team.id, user.id, action],
  );
}
export async function limitRequests(db: Database, userId: string) {
  const now = Date.now();
  const rows = await db.query<{ count: number }>(
    `INSERT INTO easykms.request_limits(user_id,window_start,count) VALUES($1,$2,1) ON CONFLICT(user_id) DO UPDATE SET count=CASE WHEN easykms.request_limits.window_start<$3 THEN 1 ELSE easykms.request_limits.count+1 END, window_start=CASE WHEN easykms.request_limits.window_start<$3 THEN $2 ELSE easykms.request_limits.window_start END RETURNING count`,
    [userId, now, now - 60000],
  );
  if (rows[0].count > 60)
    throw new AppError("Please wait a minute before trying again.", 429);
}
export async function executeTeam(
  db: Database,
  user: Identity,
  action: TeamAction,
) {
  if (action.operation === "create")
    return db.transaction(async (tx) => {
      // Serialize account-level creation limits across concurrent requests.
      await tx.query("SELECT pg_advisory_xact_lock(hashtext($1))", [user.id]);
      const count = (
        await tx.query<{ count: number }>(
          "SELECT count(*)::integer AS count FROM easykms.members WHERE user_id=$1 AND role='owner'",
          [user.id],
        )
      )[0].count;
      if (count >= 5)
        throw new AppError("An account can own up to five workspaces.");
      const id = randomUUID();
      const state: Workspace = {
        profile: { name: action.name, configuredAt: new Date().toISOString() },
        articles: [],
        gaps: [],
        searches: [],
        activity: [],
      };
      await tx.query(
        "INSERT INTO easykms.teams(id,name,state) VALUES($1,$2,$3::jsonb)",
        [id, action.name, JSON.stringify(state)],
      );
      await tx.query(
        "INSERT INTO easykms.members(team_id,user_id,email,role) VALUES($1,$2,$3,'owner')",
        [id, user.id, user.email],
      );
      return { teamId: id };
    });
  if (action.operation === "join")
    return db.transaction(async (tx) => {
      const hash = createHash("sha256").update(action.token).digest("hex");
      const destination = (
        await tx.query<{ team_id: string }>(
          "SELECT team_id FROM easykms.invitations WHERE token_hash=$1",
          [hash],
        )
      )[0];
      if (!destination)
        throw new AppError("Invitation is invalid or expired.", 403);
      await tx.query("SELECT id FROM easykms.teams WHERE id=$1 FOR UPDATE", [
        destination.team_id,
      ]);
      const invite = (
        await tx.query<{ team_id: string; email: string; role: Role }>(
          "SELECT * FROM easykms.invitations WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() FOR UPDATE",
          [hash],
        )
      )[0];
      if (!invite || invite.email !== user.email)
        throw new AppError(
          "Invitation is invalid, expired, or belongs to another email.",
          403,
        );
      await tx.query(
        "INSERT INTO easykms.members(team_id,user_id,email,role) VALUES($1,$2,$3,$4) ON CONFLICT(team_id,user_id) DO NOTHING",
        [invite.team_id, user.id, user.email, invite.role],
      );
      await tx.query(
        "UPDATE easykms.invitations SET used_at=now() WHERE token_hash=$1",
        [hash],
      );
      return { teamId: invite.team_id };
    });
  return withTeam(db, user, action.teamId, async (tx, team, role) => {
    if (action.operation === "invite") {
      if (role !== "owner")
        throw new AppError("Only workspace owners can invite members.", 403);
      const token = randomBytes(32).toString("hex");
      const hash = createHash("sha256").update(token).digest("hex");
      // A fresh invite invalidates any outstanding invite for the same email.
      await tx.query(
        "DELETE FROM easykms.invitations WHERE team_id=$1 AND email=$2",
        [team.id, action.email.toLowerCase()],
      );
      await tx.query(
        "INSERT INTO easykms.invitations(token_hash,team_id,email,role,expires_at) VALUES($1,$2,$3,$4,now()+interval '7 days')",
        [hash, team.id, action.email.toLowerCase(), action.role],
      );
      return { invitationToken: token };
    }
    if (action.operation === "remove") {
      if (role !== "owner")
        throw new AppError("Only owners can remove members.", 403);
      const member = (
        await tx.query<{ role: Role; email: string }>(
          "SELECT role,email FROM easykms.members WHERE team_id=$1 AND user_id=$2",
          [team.id, action.userId],
        )
      )[0];
      if (member?.role === "owner")
        throw new AppError("Owner removal is not supported.");
      if (member)
        await tx.query(
          "DELETE FROM easykms.invitations WHERE team_id=$1 AND email=$2",
          [team.id, member.email],
        );
      await tx.query(
        "DELETE FROM easykms.members WHERE team_id=$1 AND user_id=$2",
        [team.id, action.userId],
      );
      return { removed: true };
    }
    authorize(role, action.input, team.state, user.id);
    const output = applyAction(team.id, team.state, action.input, {
      actorId: user.id,
      actorName: user.email,
      sources:
        action.input.action === "query"
          ? retrieve(action.input.question, team.state.articles)
          : undefined,
    });
    if (!(action.input.action === "import" && action.input.preview))
      await saveTeam(tx, team, output.state, user, action.input.action);
    return {
      ...output,
      state: visibleState(output.state, role, user.id),
      role,
    };
  });
}
