import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Workspace, Article, SearchResult } from "./types";
import { AppError, recordActivity, searchArticles } from "./store";
import { seedWorkspace } from "./seed";
import { articleInput, parseImport, type ImportedArticle } from "./imports";

const text = (max: number) => z.string().trim().min(1).max(max);
const articleFields = articleInput;
export const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), article: articleFields }),
  z.object({
    action: z.literal("update"),
    id: text(100),
    article: articleFields,
  }),
  z.object({
    action: z.enum(["submit", "publish", "reject", "archive", "revise"]),
    id: text(100),
  }),
  z.object({ action: z.literal("query"), question: text(600) }),
  z.object({
    action: z.literal("feedback"),
    id: text(100),
    value: z.enum(["helpful", "unhelpful"]),
  }),
  z.object({
    action: z.literal("resolve"),
    id: text(100),
    articleId: text(100),
  }),
  z.object({ action: z.literal("reset") }),
  z.object({ action: z.literal("setup"), name: text(80) }),
  z.object({
    action: z.literal("import"),
    filename: text(160),
    content: text(24000),
    preview: z.boolean().default(false),
  }),
]);
export type Action = z.infer<typeof actionSchema>;
export function applyAction(
  workspaceId: string,
  state: Workspace,
  input: Action,
  context?: { actorId: string; actorName: string; sources?: Article[] },
): {
  state: Workspace;
  result?: SearchResult;
  articleId?: string;
  preview?: ImportedArticle[];
  imported?: number;
} {
  const now = new Date().toISOString();
  if (input.action === "reset") return { state: seedWorkspace() };
  if (input.action === "setup") {
    state.profile = { name: input.name, configuredAt: now };
    recordActivity(state, "Workspace configured", input.name);
    return { state };
  }
  if (input.action === "import") {
    let articles: ImportedArticle[];
    try {
      articles = parseImport(input.filename, input.content);
    } catch (error) {
      throw new AppError(
        error instanceof Error ? error.message : "Invalid import",
      );
    }
    if (input.preview) return { state, preview: articles };
    if (state.articles.length + articles.length > 100)
      throw new AppError("This workspace supports up to 100 policies.");
    const duplicates = articles.some(
      (a, i) =>
        state.articles.some(
          (existing) =>
            existing.title.toLowerCase() === a.title.toLowerCase() &&
            existing.status !== "Archived",
        ) ||
        articles
          .slice(0, i)
          .some(
            (previous) =>
              previous.title.toLowerCase() === a.title.toLowerCase(),
          ),
    );
    if (duplicates)
      throw new AppError(
        "A policy with this title already exists. Rename it or create a revision. No rows were imported.",
      );
    state.articles.unshift(
      ...articles.map((a) => ({
        ...a,
        id: randomUUID(),
        status: "Draft" as const,
        version: 1,
        updatedAt: now,
        owner: context?.actorName || "Demo editor",
        authorId: context?.actorId,
      })),
    );
    recordActivity(
      state,
      "Policies imported",
      `${articles.length} drafts from ${input.filename}`,
    );
    return { state, imported: articles.length };
  }
  if (input.action === "query") {
    const started = performance.now();
    const sources =
      context?.sources ?? searchArticles(workspaceId, input.question, state);
    const id = randomUUID();
    state.searches.unshift({
      actorId: context?.actorId,
      id,
      question: input.question,
      articleIds: sources.map((a) => a.id),
      createdAt: now,
    });
    state.searches = state.searches.slice(0, 1000);
    if (!sources.length) {
      const existing = state.gaps.find(
        (g) =>
          g.status === "Open" &&
          g.question.toLowerCase() === input.question.toLowerCase(),
      );
      if (existing) existing.count += 1;
      else {
        state.gaps.unshift({
          id: randomUUID(),
          question: input.question,
          count: 1,
          status: "Open",
          createdAt: now,
        });
        state.gaps = state.gaps.slice(0, 200);
      }
      recordActivity(state, "Knowledge gap captured", input.question);
    }
    return {
      state,
      result: {
        id,
        question: input.question,
        sources,
        durationMs: Math.max(1, Math.round(performance.now() - started)),
        mode: "extractive",
      },
    };
  }
  if (input.action === "feedback") {
    const search = state.searches.find((s) => s.id === input.id);
    if (!search) throw new AppError("Search not found.", 404);
    search.feedback = input.value;
    return { state };
  }
  if (input.action === "resolve") {
    const gap = state.gaps.find((g) => g.id === input.id);
    const article = state.articles.find(
      (a) =>
        a.id === input.articleId &&
        a.status === "Published" &&
        a.reviewDate >= now.slice(0, 10),
    );
    if (!gap || !article)
      throw new AppError(
        "Choose a current, published policy to resolve this gap.",
      );
    gap.status = "Resolved";
    gap.articleId = article.id;
    recordActivity(
      state,
      "Knowledge gap resolved",
      gap.question + " → " + article.title,
    );
    return { state };
  }
  if (input.action === "create") {
    if (state.articles.length >= 100)
      throw new AppError(
        "This demo supports up to 100 policies. Reset the workspace to start over.",
      );
    const article: Article = {
      ...input.article,
      id: randomUUID(),
      status: "Draft",
      version: 1,
      owner: context?.actorName || "Demo editor",
      authorId: context?.actorId,
      updatedAt: now,
    };
    state.articles.unshift(article);
    recordActivity(state, "Draft created", article.title);
    return { state, articleId: article.id };
  }
  const article = state.articles.find((a) => a.id === input.id);
  if (!article) throw new AppError("Policy not found.", 404);
  if (input.action === "update") {
    if (article.status !== "Draft")
      throw new AppError(
        "Only drafts can be edited. Create a revision for a published policy.",
      );
    Object.assign(article, input.article, {
      updatedAt: now,
      ...(context
        ? { authorId: context.actorId, owner: context.actorName }
        : {}),
    });
    recordActivity(state, "Draft updated", article.title);
  } else if (input.action === "revise") {
    if (article.status !== "Published")
      throw new AppError("Only published policies can be revised.");
    if (state.articles.length >= 100)
      throw new AppError("This demo supports up to 100 policies.");
    if (
      state.articles.some(
        (a) =>
          a.predecessorId === article.id &&
          ["Draft", "In review"].includes(a.status),
      )
    )
      throw new AppError(
        "An unpublished revision already exists for this policy.",
      );
    const revision: Article = {
      ...article,
      id: randomUUID(),
      predecessorId: article.id,
      status: "Draft",
      version: article.version + 1,
      updatedAt: now,
      owner: context?.actorName || "Demo editor",
      authorId: context?.actorId,
    };
    state.articles.unshift(revision);
    recordActivity(
      state,
      "Revision created",
      article.title + " · v" + revision.version,
    );
    return { state, articleId: revision.id };
  } else {
    const transitions = {
      submit: ["Draft", "In review"],
      publish: ["In review", "Published"],
      reject: ["In review", "Draft"],
      archive: ["Published", "Archived"],
    } as const;
    const [from, to] = transitions[input.action];
    if (article.status !== from)
      throw new AppError(
        `This action requires a policy in ${from.toLowerCase()}.`,
      );
    if (input.action === "publish") {
      if (article.reviewDate < now.slice(0, 10))
        throw new AppError(
          "Return this draft for changes and set a future review date before publishing.",
        );
      if (article.predecessorId) {
        const predecessor = state.articles.find(
          (a) => a.id === article.predecessorId,
        );
        if (!predecessor || predecessor.status !== "Published")
          throw new AppError(
            "The previous version is no longer published. Create a fresh policy instead.",
          );
        predecessor.status = "Archived";
        predecessor.updatedAt = now;
      }
    }
    article.status = to;
    article.updatedAt = now;
    recordActivity(
      state,
      input.action === "reject"
        ? "Changes requested"
        : `Policy ${to.toLowerCase()}`,
      article.title + " · v" + article.version,
    );
  }
  return { state };
}
