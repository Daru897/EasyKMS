import { DatabaseSync } from "node:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { seedWorkspace } from "./seed";
import type { Workspace, Article } from "./types";

let database: DatabaseSync | undefined;
export function db() {
  if (database) return database;
  const path = process.env.DATABASE_PATH || "./data/easykms.sqlite";
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  database = new DatabaseSync(path);
  database.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY, data TEXT NOT NULL, expires INTEGER NOT NULL, requests INTEGER NOT NULL DEFAULT 0, window INTEGER NOT NULL DEFAULT 0);
    CREATE VIRTUAL TABLE IF NOT EXISTS article_search USING fts5(workspace UNINDEXED, id UNINDEXED, title, summary, content, tokenize='porter unicode61');`);
  return database;
}
export function saveWorkspace(id: string, state: Workspace) {
  const database = db();
  database.exec("BEGIN IMMEDIATE");
  try {
    database
      .prepare("UPDATE workspaces SET data = ? WHERE id = ?")
      .run(JSON.stringify(state), id);
    database.prepare("DELETE FROM article_search WHERE workspace = ?").run(id);
    const insert = database.prepare(
      "INSERT INTO article_search(workspace,id,title,summary,content) VALUES (?,?,?,?,?)",
    );
    for (const article of state.articles.filter(
      (a) => a.status === "Published",
    ))
      insert.run(
        id,
        article.id,
        article.title,
        article.summary,
        article.content,
      );
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}
export function createWorkspace() {
  const database = db();
  const now = Date.now();
  database
    .prepare(
      "DELETE FROM article_search WHERE workspace IN (SELECT id FROM workspaces WHERE expires < ?)",
    )
    .run(now);
  database.prepare("DELETE FROM workspaces WHERE expires < ?").run(now);
  const count = database
    .prepare("SELECT count(*) AS count FROM workspaces")
    .get() as { count: number };
  if (count.count >= Number(process.env.MAX_DEMO_WORKSPACES || 1000))
    throw new AppError("The demo is at capacity. Please try again later.", 503);
  const id = randomBytes(32).toString("hex");
  const state = seedWorkspace();
  database
    .prepare("INSERT INTO workspaces(id,data,expires) VALUES (?,?,?)")
    .run(id, JSON.stringify(state), now + 7 * 86400000);
  saveWorkspace(id, state);
  return { id, state };
}
export function getWorkspace(id?: string): Workspace | undefined {
  if (!id || !/^[a-f0-9]{64}$/.test(id)) return;
  const row = db()
    .prepare("SELECT data FROM workspaces WHERE id = ? AND expires > ?")
    .get(id, Date.now()) as { data: string } | undefined;
  return row ? (JSON.parse(row.data) as Workspace) : undefined;
}
export function rateLimit(id: string) {
  const now = Date.now();
  const row = db()
    .prepare("SELECT requests, window FROM workspaces WHERE id = ?")
    .get(id) as { requests: number; window: number } | undefined;
  if (!row)
    throw new AppError(
      "Your demo expired. Reload to start a new workspace.",
      401,
    );
  if (now - row.window < 60000 && row.requests >= 60)
    throw new AppError("Please wait a minute before making more changes.", 429);
  db()
    .prepare("UPDATE workspaces SET requests = ?, window = ? WHERE id = ?")
    .run(
      now - row.window >= 60000 ? 1 : row.requests + 1,
      now - row.window >= 60000 ? now : row.window,
      id,
    );
}
export function recordActivity(
  state: Workspace,
  action: string,
  detail: string,
) {
  state.activity.unshift({
    id: randomUUID(),
    action,
    detail,
    createdAt: new Date().toISOString(),
  });
  state.activity = state.activity.slice(0, 250);
}
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
const STOP_WORDS = new Set(
  "a an the can could do does how i is it my of on or our please should that their them there these they this to was we what when where which who why will with for and are be have has customer customers tell me about policy policies need want get help you your if in within".split(
    " ",
  ),
);
const SYNONYMS: Record<string, string> = {
  returns: "return",
  refunds: "refund",
  charged: "charge",
  charges: "charge",
  reset: "reset",
  forgot: "password",
  cancellation: "cancel",
  canceling: "cancel",
  cancelling: "cancel",
  damaged: "damage",
  shipping: "delivery",
  deliveries: "delivery",
};
export function searchArticles(
  workspaceId: string,
  question: string,
  state: Workspace,
): Article[] {
  const tokens = [
    ...new Set(
      (question.toLowerCase().match(/[a-z0-9]+/g) || [])
        .filter((t) => t.length > 1 && !STOP_WORDS.has(t))
        .map((t) => SYNONYMS[t] || t),
    ),
  ].slice(0, 24);
  if (!tokens.length) return [];
  const expression = tokens.map((t) => `"${t}"*`).join(" OR ");
  const rows = db()
    .prepare(
      "SELECT id, bm25(article_search,0,0,5,2,1) AS rank FROM article_search WHERE article_search MATCH ? AND workspace = ? ORDER BY rank LIMIT 12",
    )
    .all(expression, workspaceId) as { id: string; rank: number }[];
  const today = new Date().toISOString().slice(0, 10);
  return rows
    .map((row) => state.articles.find((a) => a.id === row.id))
    .filter((a): a is Article =>
      Boolean(a && a.status === "Published" && a.reviewDate >= today),
    )
    .filter((a) => {
      const words = (a.title + " " + a.summary + " " + a.content).toLowerCase();
      const matches = tokens.filter(
        (t) => words.includes(t) || words.includes(t.replace(/s$/, "")),
      ).length;
      return (
        matches >= (tokens.length > 2 ? 2 : 1) && matches / tokens.length >= 0.4
      );
    })
    .slice(0, 3);
}
