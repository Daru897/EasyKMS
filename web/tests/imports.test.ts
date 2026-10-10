import { test } from "node:test";
import assert from "node:assert/strict";
import { parseImport } from "../lib/imports";
import { createWorkspace, getWorkspace, saveWorkspace } from "../lib/store";
import { applyAction } from "../lib/actions";
process.env.DATABASE_PATH = ":memory:";
test("Markdown title, body, and conservative draft defaults", () => {
  const [a] = parseImport(
    "sample.md",
    "# Warranty\n\nNo accidental damage coverage.",
  );
  assert.equal(a.title, "Warranty");
  assert.equal(a.category, "Agent playbooks");
});
test("CSV handles quoted commas, multiline fields, BOM, and row errors", () => {
  const rows = parseImport(
    "policies.csv",
    '\ufefftitle,content\n"Returns, international","First line\nSecond line"',
  );
  assert.equal(rows[0].title, "Returns, international");
  assert.ok(rows[0].content.includes("\n"));
  assert.throws(
    () => parseImport("bad.csv", "title,content\n,missing title"),
    /Row 2/,
  );
  assert.throws(
    () => parseImport("bad.csv", "title,content,status\nHello,world,Published"),
    /CSV needs/,
  );
  assert.throws(
    () => parseImport("bad.csv", "title,title,content\na,b,c"),
    /CSV needs/,
  );
});
test("rejects empty, binary, oversized, malformed and unsupported files", () => {
  for (const [name, body] of [
    ["a.exe", "hello"],
    ["a.md", "\u0000"],
    ["a.md", "x".repeat(25000)],
    ["a.csv", "title,content"],
    ["a.csv", 'title,content\n"unclosed,hello'],
  ])
    assert.throws(() => parseImport(name, body));
});
test("preview is non-mutating, commit is draft-only, duplicate rejection is atomic", () => {
  const { id, state } = createWorkspace();
  const input = {
    action: "import" as const,
    filename: "test.csv",
    content: "title,content\nWarranty coverage,No accidental damage coverage.",
    preview: true,
  };
  const before = state.articles.length;
  const preview = applyAction(id, state, input);
  assert.equal(preview.preview?.length, 1);
  assert.equal(state.articles.length, before);
  const committed = applyAction(id, state, { ...input, preview: false });
  saveWorkspace(id, committed.state);
  assert.equal(getWorkspace(id)!.articles[0].status, "Draft");
  assert.throws(
    () => applyAction(id, state, { ...input, preview: false }),
    /already exists/,
  );
  assert.equal(state.articles.length, before + 1);
});
