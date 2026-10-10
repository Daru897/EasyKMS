import type { Action } from "../actions";
import type { Workspace } from "../types";
import { AppError } from "../store";
export type Role = "owner" | "editor" | "reviewer" | "agent";
const permissions: Record<Role, readonly Action["action"][]> = {
  owner: [
    "query",
    "feedback",
    "create",
    "update",
    "revise",
    "submit",
    "publish",
    "reject",
    "archive",
    "resolve",
    "import",
    "setup",
  ],
  editor: [
    "query",
    "feedback",
    "create",
    "update",
    "revise",
    "submit",
    "import",
    "resolve",
  ],
  reviewer: ["query", "feedback", "publish", "reject", "archive", "resolve"],
  agent: ["query", "feedback"],
};
export function authorize(
  role: Role,
  action: Action,
  state: Workspace,
  userId: string,
) {
  if (!permissions[role].includes(action.action))
    throw new AppError("Your team role does not allow this action.", 403);
  if (
    action.action === "publish" &&
    state.articles.find((a) => a.id === action.id)?.authorId === userId
  )
    throw new AppError("A different reviewer must approve this policy.", 403);
  if (
    action.action === "feedback" &&
    state.searches.find((s) => s.id === action.id)?.actorId !== userId
  )
    throw new AppError("You can rate only your own searches.", 403);
}
export function visibleState(
  state: Workspace,
  role: Role,
  userId: string,
): Workspace {
  if (role !== "agent") return state;
  return {
    ...state,
    articles: state.articles.filter(
      (a) =>
        a.status === "Published" &&
        a.reviewDate >= new Date().toISOString().slice(0, 10),
    ),
    gaps: [],
    activity: [],
    searches: state.searches.filter((s) => s.actorId === userId),
  };
}
