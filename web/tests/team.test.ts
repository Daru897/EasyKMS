import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  executeTeam,
  readTeam,
  listTeams,
  type TeamAction,
} from "../lib/team/service";
import type { Database, Params } from "../lib/team/database";
import { importDriveText, seal, unseal } from "../lib/team/drive";
const p = new PGlite();
const wrap = (connection: Pick<PGlite, "query" | "transaction">): Database => ({
  async query<T>(sql: string, params: Params = []) {
    return (await connection.query(sql, params)).rows as T[];
  },
  async transaction(work) {
    return connection.transaction((tx) =>
      work(wrap(tx as unknown as Pick<PGlite, "query" | "transaction">)),
    );
  },
});
const db = wrap(p);
const owner = { id: randomUUID(), email: "owner@example.test" },
  editor = { id: randomUUID(), email: "editor@example.test" },
  reviewer = { id: randomUUID(), email: "reviewer@example.test" },
  agent = { id: randomUUID(), email: "agent@example.test" },
  outsider = { id: randomUUID(), email: "outsider@example.test" };
let teamId: string;
let articleId: string;
const policy = {
  title: "Water warranty policy",
  summary: "Accidental water damage warranty coverage.",
  category: "Agent playbooks" as const,
  content:
    "Accidental water damage is excluded from the warranty. Refer the customer to the repair team.",
  reviewDate: "2099-12-31",
};
async function perform(user: typeof owner, input: TeamAction) {
  return executeTeam(db, user, input) as Promise<Record<string, unknown>>;
}
test("managed Postgres team lifecycle and permission boundaries", async (t) => {
  await p.exec(
    await readFile(
      new URL("../migrations/001_teams.sql", import.meta.url),
      "utf8",
    ),
  );
  await t.test("create empty team and prevent cross-tenant reads", async () => {
    teamId = String(
      (await perform(owner, { operation: "create", name: "Acme support" }))
        .teamId,
    );
    assert.equal((await readTeam(db, owner, teamId)).state.articles.length, 0);
    await assert.rejects(() => readTeam(db, outsider, teamId), /not found/);
    assert.equal((await listTeams(db, outsider)).length, 0);
  });
  await t.test(
    "invites are email-bound, single use, and role-limited",
    async () => {
      for (const [user, role] of [
        [editor, "editor"],
        [reviewer, "reviewer"],
        [agent, "agent"],
      ] as const) {
        const token = String(
          (
            await perform(owner, {
              operation: "invite",
              teamId,
              email: user.email,
              role,
            })
          ).invitationToken,
        );
        await assert.rejects(
          () => perform(outsider, { operation: "join", token }),
          /another email/,
        );
        await perform(user, { operation: "join", token });
        await assert.rejects(
          () => perform(user, { operation: "join", token }),
          /invalid/,
        );
      }
      await assert.rejects(
        () =>
          perform(editor, {
            operation: "invite",
            teamId,
            email: outsider.email,
            role: "agent",
          }),
        /Only workspace owners/,
      );
    },
  );
  await t.test(
    "editors draft, agents cannot see drafts or publish, reviewers cannot author",
    async () => {
      articleId = String(
        (
          await perform(editor, {
            operation: "mutate",
            teamId,
            input: { action: "create", article: policy },
          })
        ).articleId,
      );
      assert.equal(
        (await readTeam(db, agent, teamId)).state.articles.length,
        0,
      );
      await assert.rejects(
        () =>
          perform(agent, {
            operation: "mutate",
            teamId,
            input: { action: "publish", id: articleId },
          }),
        /role/,
      );
      await assert.rejects(
        () =>
          perform(reviewer, {
            operation: "mutate",
            teamId,
            input: { action: "create", article: policy },
          }),
        /role/,
      );
      await perform(editor, {
        operation: "mutate",
        teamId,
        input: { action: "submit", id: articleId },
      });
      await perform(reviewer, {
        operation: "mutate",
        teamId,
        input: { action: "publish", id: articleId },
      });
      assert.equal(
        (await readTeam(db, agent, teamId)).state.articles.length,
        1,
      );
    },
  );
  await t.test("even owners cannot approve their own policies", async () => {
    const own = String(
      (
        await perform(owner, {
          operation: "mutate",
          teamId,
          input: {
            action: "create",
            article: { ...policy, title: "Owner draft" },
          },
        })
      ).articleId,
    );
    await perform(owner, {
      operation: "mutate",
      teamId,
      input: { action: "submit", id: own },
    });
    await assert.rejects(
      () =>
        perform(owner, {
          operation: "mutate",
          teamId,
          input: { action: "publish", id: own },
        }),
      /different reviewer/,
    );
  });
  await t.test(
    "queries are attributable and feedback is limited to the asker",
    async () => {
      const output = await perform(agent, {
        operation: "mutate",
        teamId,
        input: { action: "query", question: "water damage warranty" },
      });
      const result = output.result as { id: string; sources: unknown[] };
      assert.equal(result.sources.length, 1);
      await assert.rejects(
        () =>
          perform(editor, {
            operation: "mutate",
            teamId,
            input: { action: "feedback", id: result.id, value: "helpful" },
          }),
        /own searches/,
      );
      await perform(agent, {
        operation: "mutate",
        teamId,
        input: { action: "feedback", id: result.id, value: "helpful" },
      });
      assert.equal(
        (await readTeam(db, agent, teamId)).state.activity.length,
        0,
      );
    },
  );
  await t.test(
    "Drive import is idempotent, draft-only, and revisions preserve publication",
    async () => {
      const file = {
        id: "abc_file_123",
        name: "Drive policy",
        content: "A sample imported policy.",
      };
      const imported = await importDriveText(db, editor, teamId, file);
      const before = (await readTeam(db, editor, teamId)).state.articles.length;
      await importDriveText(db, editor, teamId, file);
      assert.equal(
        (await readTeam(db, editor, teamId)).state.articles.length,
        before,
      );
      await assert.rejects(
        () =>
          importDriveText(db, editor, teamId, {
            ...file,
            content: "Changed policy.",
          }),
        /pending/,
      );
      await assert.rejects(
        () => importDriveText(db, agent, teamId, file),
        /Only editors/,
      );
      const importedId = imported.articleId!;
      await perform(editor, {
        operation: "mutate",
        teamId,
        input: { action: "submit", id: importedId },
      });
      await perform(reviewer, {
        operation: "mutate",
        teamId,
        input: { action: "publish", id: importedId },
      });
      const revision = await importDriveText(db, editor, teamId, {
        ...file,
        content: "Changed policy.",
      });
      const articles = (await readTeam(db, editor, teamId)).state.articles;
      assert.equal(
        articles.find((a) => a.id === importedId)?.status,
        "Published",
      );
      assert.equal(
        articles.find((a) => a.id === revision.articleId)?.status,
        "Draft",
      );
      assert.equal(
        articles.find((a) => a.id === revision.articleId)?.content,
        "Changed policy.",
      );
      const visible = (await readTeam(db, agent, teamId)).state.articles;
      assert.ok(visible.some((a) => a.id === importedId));
      assert.ok(!visible.some((a) => a.id === revision.articleId));
    },
  );
  await t.test(
    "revoked users lose access immediately and owners cannot be removed",
    async () => {
      const reinvite = await perform(owner, {
        operation: "invite",
        teamId,
        email: agent.email,
        role: "agent",
      });
      await perform(owner, { operation: "remove", teamId, userId: agent.id });
      await assert.rejects(
        () =>
          perform(agent, {
            operation: "join",
            token: String(reinvite.invitationToken),
          }),
        /invalid/,
      );
      await assert.rejects(() => readTeam(db, agent, teamId), /not found/);
      await assert.rejects(
        () => perform(owner, { operation: "remove", teamId, userId: owner.id }),
        /Owner removal/,
      );
    },
  );
  await p.close();
});
test("Drive tokens are authenticated, encrypted, and bound to team/user scope", () => {
  process.env.TOKEN_ENCRYPTION_KEY = "a".repeat(64);
  const tokens = {
    accessToken: "test-private-token",
    refreshToken: "test-refresh-token",
    expiresAt: 10,
  };
  const encrypted = seal(tokens, "team:user");
  assert.ok(!encrypted.includes(tokens.accessToken));
  assert.deepEqual(unseal(encrypted, "team:user"), tokens);
  assert.throws(() => unseal(encrypted, "other:user"));
  const parts = encrypted.split(".");
  parts[1] = Buffer.alloc(16).toString("base64url");
  assert.throws(() => unseal(parts.join("."), "team:user"));
});
