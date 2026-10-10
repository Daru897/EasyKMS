import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { identity } from "@/lib/team/auth";
import { database } from "@/lib/team/database";
import {
  listTeams,
  readTeam,
  executeTeam,
  teamActionSchema,
  limitRequests,
} from "@/lib/team/service";
import { failure, jsonBody } from "@/lib/http";
import { AppError } from "@/lib/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
export async function GET(request: NextRequest) {
  try {
    const user = await identity(request);
    const db = database();
    await limitRequests(db, user.id);
    const team = request.nextUrl.searchParams.get("team");
    if (team && !z.uuid().safeParse(team).success)
      throw new AppError("Invalid workspace.");
    return NextResponse.json(
      team
        ? await readTeam(db, user, team)
        : { teams: await listTeams(db, user) },
      { headers },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    const user = await identity(request);
    const db = database();
    await limitRequests(db, user.id);
    const parsed = teamActionSchema.safeParse(await jsonBody(request));
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message);
    return NextResponse.json(await executeTeam(db, user, parsed.data), {
      headers,
    });
  } catch (error) {
    return failure(error);
  }
}
