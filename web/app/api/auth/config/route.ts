import { NextResponse } from "next/server";
import { teamConfigured } from "@/lib/team/auth";
export const dynamic = "force-dynamic";
export function GET() {
  const enabled = teamConfigured();
  return NextResponse.json(
    {
      enabled,
      url: enabled ? process.env.SUPABASE_URL : undefined,
      key: enabled ? process.env.SUPABASE_ANON_KEY : undefined,
      drive: Boolean(
        enabled &&
        process.env.GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_CLIENT_SECRET &&
        process.env.TOKEN_ENCRYPTION_KEY,
      ),
      ai: Boolean(
        enabled &&
        process.env.OPENAI_API_KEY &&
        process.env.AI_MODEL &&
        process.env.AI_EVALUATION_APPROVED === "true",
      ),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
