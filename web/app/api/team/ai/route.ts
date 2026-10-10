import { NextResponse } from "next/server";
import { z } from "zod";
import { identity } from "@/lib/team/auth";
import { database } from "@/lib/team/database";
import { readTeam, limitRequests, withTeam } from "@/lib/team/service";
import { fuseRetrieval } from "@/lib/retrieval";
import { generateAnswer, expandQuery } from "@/lib/ai";
import { AppError } from "@/lib/store";
import { failure, jsonBody } from "@/lib/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const user = await identity(request);
    const db = database();
    await limitRequests(db, user.id);
    if (process.env.AI_EVALUATION_APPROVED !== "true")
      throw new AppError(
        "AI summaries are disabled until a live evaluation is approved.",
        503,
      );
    const parsed = z
      .object({ teamId: z.uuid(), question: z.string().trim().min(1).max(600) })
      .safeParse(await jsonBody(request));
    if (!parsed.success) throw new AppError("Invalid question.");
    const { teamId, question } = parsed.data;
    const state = (await readTeam(db, user, teamId)).state;
    const paraphrases = await expandQuery(question);
    const sources = fuseRetrieval(question, paraphrases, state.articles);
    const answer = await generateAnswer(question, sources);
    // Membership and publication may have changed during the remote model request.
    await withTeam(db, user, teamId, async (_tx, team) => {
      for (const source of sources) {
        const current = team.state.articles.find((a) => a.id === source.id);
        if (
          !current ||
          current.status !== "Published" ||
          current.content !== source.content ||
          current.reviewDate < new Date().toISOString().slice(0, 10)
        )
          throw new AppError(
            "A source changed during generation. Search again.",
            409,
          );
      }
    });
    return NextResponse.json(
      {
        ...answer,
        sources: sources.map((s, i) => ({
          source: i + 1,
          id: s.id,
          title: s.title,
          version: s.version,
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(
      error instanceof AppError
        ? error
        : new AppError(
            "AI summary unavailable. Use the published excerpts instead.",
            502,
          ),
    );
  }
}
