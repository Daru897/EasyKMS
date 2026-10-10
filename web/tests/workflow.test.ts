import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createWorkspace,
  getWorkspace,
  saveWorkspace,
  searchArticles,
  db,
  rateLimit,
} from "../lib/store";
import { applyAction, actionSchema, type Action } from "../lib/actions";
process.env.DATABASE_PATH = ":memory:";
const policy = {
  title: "Accidental water damage warranty",
  category: "Agent playbooks" as const,
  summary: "Water damage warranty coverage and escalation.",
  content:
    "The warranty does not cover accidental water damage. Offer a paid inspection and send the customer to the repair team.",
  reviewDate: "2099-12-31",
};
function perform(id: string, input: Action) {
  const output = applyAction(id, getWorkspace(id)!, input);
  saveWorkspace(id, output.state);
  return output;
}

test("each visitor receives an isolated workspace; unknown tokens never select another tenant", () => {
  const first = createWorkspace();
  const second = createWorkspace();
  const output = perform(first.id, { action: "create", article: policy });
  assert.ok(
    getWorkspace(first.id)!.articles.some((a) => a.id === output.articleId),
  );
  assert.equal(
    getWorkspace(second.id)!.articles.some((a) => a.id === output.articleId),
    false,
  );
  assert.equal(getWorkspace("bad-token"), undefined);
  assert.throws(
    () => perform(second.id, { action: "submit", id: output.articleId! }),
    /not found/,
  );
});
test("search → gap → draft → review → publish → retrieve → resolve works end to end", () => {
  const { id } = createWorkspace();
  const query = "Does the warranty cover accidental water damage?";
  assert.equal(
    perform(id, { action: "query", question: query }).result!.sources.length,
    0,
  );
  const created = perform(id, { action: "create", article: policy });
  assert.equal(searchArticles(id, query, getWorkspace(id)!).length, 0);
  assert.throws(
    () => perform(id, { action: "publish", id: created.articleId! }),
    /requires/,
  );
  perform(id, { action: "submit", id: created.articleId! });
  assert.equal(searchArticles(id, query, getWorkspace(id)!).length, 0);
  perform(id, { action: "publish", id: created.articleId! });
  const answer = perform(id, { action: "query", question: query }).result!;
  assert.equal(answer.sources[0].id, created.articleId);
  assert.equal(answer.sources[0].content, policy.content);
  perform(id, { action: "feedback", id: answer.id, value: "helpful" });
  assert.equal(getWorkspace(id)!.searches[0].feedback, "helpful");
  const gap = getWorkspace(id)!.gaps.find((g) => g.question === query)!;
  perform(id, { action: "resolve", id: gap.id, articleId: created.articleId! });
  assert.equal(
    getWorkspace(id)!.gaps.find((g) => g.id === gap.id)!.status,
    "Resolved",
  );
});
test("published version remains available during revision; replacement is atomic", () => {
  const { id } = createWorkspace();
  const revision = perform(id, { action: "revise", id: "refunds" });
  assert.equal(
    getWorkspace(id)!.articles.find((a) => a.id === "refunds")!.status,
    "Published",
  );
  assert.throws(
    () => perform(id, { action: "revise", id: "refunds" }),
    /already exists/,
  );
  assert.throws(
    () => perform(id, { action: "update", id: "refunds", article: policy }),
    /Only drafts/,
  );
  perform(id, { action: "submit", id: revision.articleId! });
  perform(id, { action: "publish", id: revision.articleId! });
  assert.equal(
    getWorkspace(id)!.articles.find((a) => a.id === "refunds")!.status,
    "Archived",
  );
  const sources = searchArticles(id, "refund policy", getWorkspace(id)!);
  assert.ok(sources.some((a) => a.id === revision.articleId));
  assert.ok(!sources.some((a) => a.id === "refunds"));
});
test("draft, archived, and overdue policies never appear in search", () => {
  const { id } = createWorkspace();
  const state = getWorkspace(id)!;
  for (const article of state.articles) {
    article.status = "Published";
    article.reviewDate = "2000-01-01";
  }
  saveWorkspace(id, state);
  assert.equal(searchArticles(id, "refund return", state).length, 0);
});
test("rejecting review allows editing; past review date prevents publishing", () => {
  const { id } = createWorkspace();
  perform(id, { action: "reject", id: "subscription" });
  perform(id, {
    action: "update",
    id: "subscription",
    article: { ...policy, reviewDate: "2000-01-01" },
  });
  perform(id, { action: "submit", id: "subscription" });
  assert.throws(
    () => perform(id, { action: "publish", id: "subscription" }),
    /future review date/,
  );
});
test("common support queries return relevant approved sources; weak overlap abstains", () => {
  const { id, state } = createWorkspace();
  for (const [query, expected] of [
    ["What is our refund policy?", "refunds"],
    ["How do I reset a password?", "password"],
    ["My delivery is late", "shipping"],
    ["Can I cancel an order?", "cancel"],
    ["I was charged twice, a duplicate charge", "duplicate"],
  ])
    assert.ok(
      searchArticles(id, query, state).some((a) => a.id === expected),
      query,
    );
  for (const query of [
    "What is the capital of France?",
    "Does the warranty cover accidental water damage?",
    "the and a",
    "refund nuclear reactor quantum acceleration",
  ])
    assert.equal(searchArticles(id, query, state).length, 0, query);
});
test("FTS syntax and SQL-like input are treated as plain search data", () => {
  const { id, state } = createWorkspace();
  assert.doesNotThrow(() =>
    searchArticles(id, "\" OR * NEAR() '); DROP TABLE workspaces; --", state),
  );
  assert.ok(getWorkspace(id));
});
test("input validation rejects oversized questions, invalid actions, and invalid dates", () => {
  assert.equal(
    actionSchema.safeParse({ action: "query", question: "a".repeat(601) })
      .success,
    false,
  );
  assert.equal(
    actionSchema.safeParse({
      action: "create",
      article: { ...policy, reviewDate: "2026-02-30" },
    }).success,
    false,
  );
  assert.equal(actionSchema.safeParse({ action: "destroy" }).success, false);
});
test("feedback is mutable rather than double-counted; reset restores the seed", () => {
  const { id } = createWorkspace();
  const result = perform(id, {
    action: "query",
    question: "refund policy",
  }).result!;
  perform(id, { action: "feedback", id: result.id, value: "helpful" });
  perform(id, { action: "feedback", id: result.id, value: "unhelpful" });
  assert.equal(getWorkspace(id)!.searches.length, 1);
  assert.equal(getWorkspace(id)!.searches[0].feedback, "unhelpful");
  perform(id, { action: "reset" });
  assert.equal(getWorkspace(id)!.searches.length, 0);
  assert.equal(getWorkspace(id)!.articles.length, 8);
});
test("expired sessions are inaccessible and pruned with their search rows", () => {
  const { id } = createWorkspace();
  db().prepare("UPDATE workspaces SET expires = 0 WHERE id = ?").run(id);
  assert.equal(getWorkspace(id), undefined);
  createWorkspace();
  assert.equal(
    (
      db()
        .prepare("SELECT count(*) AS n FROM article_search WHERE workspace = ?")
        .get(id) as { n: number }
    ).n,
    0,
  );
});
test("per-workspace mutation requests are bounded", () => {
  const { id } = createWorkspace();
  for (let n = 0; n < 60; n++) rateLimit(id);
  assert.throws(() => rateLimit(id), /wait a minute/);
});
