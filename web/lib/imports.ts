import { parse } from "csv-parse/sync";
import { z } from "zod";
export const articleInput = z.object({
  title: z.string().trim().min(1).max(160),
  category: z.enum([
    "Billing & payments",
    "Account & security",
    "Orders & shipping",
    "Agent playbooks",
  ]),
  summary: z.string().trim().min(1).max(300),
  content: z.string().trim().min(1).max(20000),
  reviewDate: z.iso.date(),
});
export type ImportedArticle = z.infer<typeof articleInput>;
export function parseImport(
  filename: string,
  content: string,
): ImportedArticle[] {
  if (Buffer.byteLength(content, "utf8") > 24000)
    throw new Error("Use a file smaller than 24 KB.");
  if (content.includes("\u0000"))
    throw new Error("Binary files are not supported.");
  const defaults = {
    category: "Agent playbooks",
    reviewDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
  };
  if (/\.(md|markdown)$/i.test(filename)) {
    const heading = content.match(/^#\s+(.+)$/m)?.[1];
    const title = heading || filename.replace(/\.(md|markdown)$/i, "");
    return [
      articleInput.parse({
        ...defaults,
        title,
        content: content.trim(),
        summary: content
          .replace(/^#+\s*/gm, "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 300),
      }),
    ];
  }
  if (!/\.csv$/i.test(filename))
    throw new Error("Choose a Markdown (.md) or CSV file.");
  const headers = new Set([
    "title",
    "category",
    "summary",
    "content",
    "reviewDate",
  ]);
  const rows = parse(content, {
    bom: true,
    skip_empty_lines: true,
    max_record_size: 24000,
    columns: (names: string[]) => {
      if (
        new Set(names).size !== names.length ||
        names.some((n) => !headers.has(n)) ||
        !names.includes("title") ||
        !names.includes("content")
      )
        throw new Error(
          "CSV needs title and content; optional columns: category, summary, reviewDate.",
        );
      return names;
    },
  }) as Record<string, string>[];
  if (!rows.length || rows.length > 50)
    throw new Error("Import between 1 and 50 policies at a time.");
  return rows.map((row, index) => {
    const parsed = articleInput.safeParse({
      ...defaults,
      ...row,
      category: row.category || defaults.category,
      reviewDate: row.reviewDate || defaults.reviewDate,
      summary: row.summary || row.content?.replace(/\s+/g, " ").slice(0, 300),
    });
    if (!parsed.success)
      throw new Error(`Row ${index + 2}: ${parsed.error.issues[0].message}`);
    return parsed.data;
  });
}
