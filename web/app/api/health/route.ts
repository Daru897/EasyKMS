import { NextResponse } from "next/server";
import { db } from "@/lib/store";
import { database } from "@/lib/team/database";
import { teamConfigured } from "@/lib/team/auth";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    db().prepare("SELECT 1").get();
    if (teamConfigured())
      await database().query("SELECT id FROM easykms.teams LIMIT 0");
    return NextResponse.json(
      {
        status: "ok",
        service: "easykms",
        mode: teamConfigured() ? "demo-and-team" : "showcase",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503 });
  }
}
