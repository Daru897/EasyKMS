import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from "node:crypto";
import { AppError } from "../store";
import type { Database } from "./database";
import type { Identity } from "./auth";
import { withTeam, saveTeam } from "./service";
import { applyAction } from "../actions";
export type Tokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
};
function key() {
  const value = process.env.TOKEN_ENCRYPTION_KEY;
  if (!value || !/^([a-f0-9]{64})$/i.test(value))
    throw new AppError(
      "Configure a 32-byte hexadecimal TOKEN_ENCRYPTION_KEY.",
      503,
    );
  return Buffer.from(value, "hex");
}
export function seal(tokens: Tokens, scope: string) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), nonce);
  cipher.setAAD(Buffer.from(scope));
  const data = Buffer.concat([
    cipher.update(JSON.stringify(tokens), "utf8"),
    cipher.final(),
  ]);
  return [nonce, cipher.getAuthTag(), data]
    .map((b) => b.toString("base64url"))
    .join(".");
}
export function unseal(value: string, scope: string): Tokens {
  const [nonce, tag, data] = value
    .split(".")
    .map((v) => Buffer.from(v, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", key(), nonce);
  decipher.setAAD(Buffer.from(scope));
  decipher.setAuthTag(tag);
  return JSON.parse(
    Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8"),
  );
}
function editable(role: string) {
  if (!["owner", "editor"].includes(role))
    throw new AppError("Only editors can import from Drive.", 403);
}
export async function saveConnection(
  db: Database,
  user: Identity,
  teamId: string,
  tokens: Tokens,
) {
  await withTeam(db, user, teamId, async (tx, _team, role) => {
    editable(role);
    if (!tokens.refreshToken) {
      const previous = (
        await tx.query<{ encrypted_tokens: string }>(
          "SELECT encrypted_tokens FROM easykms.connections WHERE team_id=$1 AND user_id=$2",
          [teamId, user.id],
        )
      )[0];
      if (previous)
        tokens = {
          ...tokens,
          refreshToken: unseal(
            previous.encrypted_tokens,
            `${teamId}:${user.id}`,
          ).refreshToken,
        };
    }
    await tx.query(
      "INSERT INTO easykms.connections(team_id,user_id,encrypted_tokens) VALUES($1,$2,$3) ON CONFLICT(team_id,user_id) DO UPDATE SET encrypted_tokens=$3,updated_at=now()",
      [teamId, user.id, seal(tokens, `${teamId}:${user.id}`)],
    );
  });
}
export async function connection(db: Database, user: Identity, teamId: string) {
  return withTeam(db, user, teamId, async (tx, _team, role) => {
    editable(role);
    const row = (
      await tx.query<{ encrypted_tokens: string }>(
        "SELECT encrypted_tokens FROM easykms.connections WHERE team_id=$1 AND user_id=$2",
        [teamId, user.id],
      )
    )[0];
    if (!row) throw new AppError("Connect and save your Google account first.");
    return unseal(row.encrypted_tokens, `${teamId}:${user.id}`);
  });
}
export async function disconnect(db: Database, user: Identity, teamId: string) {
  await withTeam(db, user, teamId, async (tx, _team, role) => {
    editable(role);
    await tx.query(
      "DELETE FROM easykms.connections WHERE team_id=$1 AND user_id=$2",
      [teamId, user.id],
    );
  });
}
async function refreshed(tokens: Tokens): Promise<Tokens> {
  if (
    !tokens.refreshToken ||
    !process.env.GOOGLE_CLIENT_ID ||
    !process.env.GOOGLE_CLIENT_SECRET
  )
    throw new AppError("Reconnect Google Drive to refresh access.", 401);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new AppError(
      "Google access expired or was revoked. Reconnect Drive.",
      401,
    );
  const data = await response.json();
  if (typeof data.access_token !== "string")
    throw new AppError("Google returned an invalid token.", 502);
  return {
    ...tokens,
    accessToken: data.access_token,
    expiresAt:
      Date.now() + Math.min(Number(data.expires_in) || 3600, 3600) * 1000,
  };
}
export async function driveRequest(
  db: Database,
  user: Identity,
  teamId: string,
  path: string,
) {
  let tokens = await connection(db, user, teamId);
  if (tokens.expiresAt < Date.now() + 60000) {
    tokens = await refreshed(tokens);
    await saveConnection(db, user, teamId, tokens);
  }
  const call = () =>
    fetch(`https://www.googleapis.com/drive/v3/${path}`, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
      signal: AbortSignal.timeout(20000),
    });
  let response = await call();
  if (response.status === 401 && tokens.refreshToken) {
    tokens = await refreshed(tokens);
    await saveConnection(db, user, teamId, tokens);
    response = await call();
  }
  if (!response.ok)
    throw new AppError(
      response.status === 404
        ? "The file is unavailable or was deleted."
        : "Google Drive could not complete this request. Check access and try again.",
      response.status === 429 ? 429 : 502,
    );
  return response;
}
export async function boundedText(response: Response, max = 24000) {
  const reader = response.body?.getReader();
  if (!reader) throw new AppError("The file is empty.");
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.length;
    if (bytes > max) {
      await reader.cancel();
      throw new AppError("This file exceeds the 24 KB text import limit.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}
export async function importDriveText(
  db: Database,
  user: Identity,
  teamId: string,
  file: { id: string; name: string; content: string },
) {
  return withTeam(db, user, teamId, async (tx, team, role) => {
    editable(role);
    const context = { actorId: user.id, actorName: user.email };
    const hash = createHash("sha256")
      .update(file.name + "\n" + file.content)
      .digest("hex");
    const sourceKey = `google-drive:${file.id}`;
    const previous = team.state.articles
      .filter((a) => a.sourceKey === sourceKey && a.status !== "Archived")
      .sort((a, b) => b.version - a.version)[0];
    if (previous?.sourceHash === hash)
      return {
        message:
          "This source version is already imported. No duplicate was created.",
      };
    if (previous && previous.status !== "Published")
      throw new AppError(
        "This file has a pending draft or review. Finish it before importing another source version.",
      );
    const fields = {
      title: file.name.slice(0, 160),
      summary: file.content.replace(/\s+/g, " ").slice(0, 300),
      content: file.content,
      category: "Agent playbooks" as const,
      reviewDate: new Date(Date.now() + 90 * 86400000)
        .toISOString()
        .slice(0, 10),
    };
    if (!file.content.trim() || file.content.length > 20000)
      throw new AppError(
        "Import requires between 1 and 20,000 text characters.",
      );
    const output = applyAction(
      team.id,
      team.state,
      previous
        ? { action: "revise", id: previous.id }
        : { action: "create", article: fields },
      context,
    );
    if (previous)
      applyAction(
        team.id,
        team.state,
        { action: "update", id: output.articleId!, article: fields },
        context,
      );
    const article = team.state.articles.find((a) => a.id === output.articleId)!;
    article.sourceKey = sourceKey;
    article.sourceHash = hash;
    await saveTeam(tx, team, team.state, user, "drive-import");
    return {
      articleId: article.id,
      message:
        "Source imported as a draft. Submit it for review before publishing.",
    };
  });
}
