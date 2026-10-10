import type { Article } from "./types";
const stop = new Set(
  "a an the can could do does how i is it my of on or our please should that their them there these they this to was we what when where which who why will with for and are be have has customer customers tell me about policy policies need want get help you your if in within".split(
    " ",
  ),
);
const synonyms: Record<string, string> = {
  refunds: "refund",
  returns: "return",
  shipping: "delivery",
  deliveries: "delivery",
  forgot: "password",
  charged: "charge",
  charges: "charge",
  cancellation: "cancel",
  canceling: "cancel",
  cancelling: "cancel",
};
export function terms(text: string) {
  return [
    ...new Set(
      (text.toLowerCase().match(/[a-z0-9]+/g) || [])
        .filter((t) => t.length > 1 && !stop.has(t))
        .map((t) => synonyms[t] || t),
    ),
  ].slice(0, 24);
}
export function retrieve(question: string, articles: Article[]): Article[] {
  const tokens = terms(question);
  if (!tokens.length) return [];
  const current = articles.filter(
    (a) =>
      a.status === "Published" &&
      a.reviewDate >= new Date().toISOString().slice(0, 10),
  );
  return current
    .map((a) => {
      const body = (a.title + " " + a.summary + " " + a.content).toLowerCase();
      const stem = (value: string) =>
        value.length > 4 ? value.replace(/ies$/, "y").replace(/s$/, "") : value;
      const words = new Set(
        (body.match(/[a-z0-9]+/g) || []).map((t) => stem(synonyms[t] || t)),
      );
      const matches = tokens.filter((t) => words.has(stem(t)));
      const title = terms(a.title);
      return {
        a,
        coverage: matches.length / tokens.length,
        count: matches.length,
        score:
          matches.reduce((n, t) => n + 1 + (title.includes(t) ? 3 : 0), 0) /
          Math.log(10 + body.length),
      };
    })
    .filter((r) => r.count >= (tokens.length > 2 ? 2 : 1) && r.coverage >= 0.4)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((r) => r.a);
}
export function fuseRetrieval(
  question: string,
  paraphrases: string[],
  articles: Article[],
): Article[] {
  const scores = new Map<string, { article: Article; score: number }>();
  for (const [index, query] of [
    question,
    ...paraphrases.slice(0, 3),
  ].entries()) {
    retrieve(query, articles).forEach((article, rank) => {
      const old = scores.get(article.id);
      scores.set(article.id, {
        article,
        score: (old?.score || 0) + (index === 0 ? 2 : 1) / (60 + rank + 1),
      });
    });
  }
  return [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((row) => row.article);
}
