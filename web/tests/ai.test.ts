import { test } from "node:test";
import assert from "node:assert/strict";
import cases from "../evals/cases.json";
import { seedWorkspace } from "../lib/seed";
import { retrieve, fuseRetrieval } from "../lib/retrieval";
import { generateAnswer, validateAnswer, expandQuery } from "../lib/ai";
const articles = seedWorkspace().articles;
test("offline retrieval evaluation: positives, abstention, and unpublished policies", () => {
  for (const item of cases) {
    const hits = retrieve(item.question, articles);
    if (item.expected)
      assert.ok(
        hits.some((a) => a.id === item.expected),
        item.question,
      );
    else assert.equal(hits.length, 0, item.question);
  }
});
test("rank fusion never introduces unpublished or expired sources", () => {
  const hits = fuseRetrieval(
    "account help",
    ["password reset", "subscription pause"],
    articles,
  );
  assert.ok(hits.every((a) => a.status === "Published"));
  assert.ok(hits.some((a) => a.id === "password"));
});
test("AI evidence validator rejects invented quotes, dangling citations, empty answers", () => {
  const source = articles[0];
  const valid = {
    answer: "Returns are accepted within 30 days. [1]",
    abstain: false,
    citations: [
      {
        source: 1,
        quote:
          "Customers can return unused products within 30 days of delivery.",
      },
    ],
  };
  assert.equal(validateAnswer(valid, [source]).abstain, false);
  assert.throws(() =>
    validateAnswer(
      {
        ...valid,
        citations: [
          { source: 1, quote: "Refunds are always approved automatically." },
        ],
      },
      [source],
    ),
  );
  assert.throws(() =>
    validateAnswer({ ...valid, answer: "Every return is accepted [8]" }, [
      source,
    ]),
  );
  assert.throws(() => validateAnswer({ ...valid, answer: "" }, [source]));
  assert.equal(
    validateAnswer({ answer: "ignored", abstain: true, citations: [] }, [
      source,
    ]).answer,
    "",
  );
});
test("model adapter handles structured responses, provider errors, and abstention without paid calls", async () => {
  process.env.OPENAI_API_KEY = "test-only";
  process.env.AI_MODEL = "test-model";
  let called = false;
  const mock: typeof fetch = async (_input, init) => {
    called = true;
    assert.equal(JSON.parse(String(init?.body)).store, false);
    return Response.json({
      status: "completed",
      output: [
        {
          content: [
            {
              type: "output_text",
              text: JSON.stringify({
                answer: "Returns within 30 days. [1]",
                abstain: false,
                citations: [
                  {
                    source: 1,
                    quote:
                      "Customers can return unused products within 30 days of delivery.",
                  },
                ],
              }),
            },
          ],
        },
      ],
    });
  };
  assert.equal(
    (await generateAnswer("refund policy", [articles[0]], mock)).abstain,
    false,
  );
  assert.ok(called);
  called = false;
  assert.equal((await generateAnswer("unknown", [], mock)).abstain, true);
  assert.equal(called, false);
  await assert.rejects(
    () =>
      generateAnswer(
        "refund",
        [articles[0]],
        async () => new Response("error", { status: 429 }),
      ),
    /provider/,
  );
});
test("query expansion rejects oversized or malformed paraphrases", async () => {
  const mock: typeof fetch = async () =>
    Response.json({
      status: "completed",
      output: [
        {
          content: [
            {
              type: "output_text",
              text: JSON.stringify({ queries: ["password reset"] }),
            },
          ],
        },
      ],
    });
  assert.deepEqual(await expandQuery("cannot sign in", mock), [
    "password reset",
  ]);
  await assert.rejects(
    () =>
      expandQuery("query", async () => Response.json({ status: "incomplete" })),
    /Incomplete/,
  );
});
