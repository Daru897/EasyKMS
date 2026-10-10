export type Status = "Draft" | "In review" | "Published" | "Archived";
export type Article = {
  id: string;
  predecessorId?: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  status: Status;
  version: number;
  updatedAt: string;
  owner: string;
  authorId?: string;
  sourceKey?: string;
  sourceHash?: string;
  reviewDate: string;
};
export type Gap = {
  id: string;
  question: string;
  status: "Open" | "Resolved";
  count: number;
  createdAt: string;
  articleId?: string;
};
export type Activity = {
  id: string;
  action: string;
  detail: string;
  createdAt: string;
};
export type SearchRecord = {
  actorId?: string;
  id: string;
  question: string;
  articleIds: string[];
  createdAt: string;
  feedback?: "helpful" | "unhelpful";
};
export type Workspace = {
  profile?: { name: string; configuredAt: string };
  articles: Article[];
  gaps: Gap[];
  activity: Activity[];
  searches: SearchRecord[];
};
export type SearchResult = {
  id: string;
  question: string;
  sources: Article[];
  durationMs: number;
  mode: "extractive";
};
