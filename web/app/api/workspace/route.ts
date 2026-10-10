import { NextRequest, NextResponse } from "next/server";
import { actionSchema, applyAction } from "@/lib/actions";
import {
  AppError,
  createWorkspace,
  getWorkspace,
  rateLimit,
  saveWorkspace,
} from "@/lib/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const cookie = "easykms_demo";
const headers = { "Cache-Control": "no-store" };
function failure(error: unknown) {
  if (error instanceof AppError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status, headers },
    );
  console.error(
    "Workspace request failed",
    error instanceof Error ? error.message : "Unknown error",
  );
  return NextResponse.json(
    { error: "Something went wrong. Please try again." },
    { status: 500, headers },
  );
}
export function GET(request: NextRequest) {
  try {
    const id = request.cookies.get(cookie)?.value;
    const state = getWorkspace(id);
    if (state) return NextResponse.json({ state }, { headers });
    const workspace = createWorkspace();
    const response = NextResponse.json({ state: workspace.state }, { headers });
    response.cookies.set(cookie, workspace.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.COOKIE_SECURE === "true",
      path: "/",
      maxAge: 7 * 86400,
    });
    return response;
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    // Next may normalize nextUrl to localhost. The direct Host header retains the browser host.
    // Hosted deployments must pin APP_ORIGIN; local development can use either loopback name.
    const requestOrigin = request.headers.get("origin");
    const configuredOrigin = process.env.APP_ORIGIN;
    const host = request.headers.get("host");
    const localHost = host && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
    const expectedOrigin =
      configuredOrigin ||
      (localHost ? `http://${host}` : request.nextUrl.origin);
    if (requestOrigin !== expectedOrigin)
      throw new AppError(
        "This request must come from your EasyKMS workspace.",
        403,
      );
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      throw new AppError("Expected JSON.", 415);
    const id = request.cookies.get(cookie)?.value;
    const state = getWorkspace(id);
    if (!id || !state)
      throw new AppError(
        "Your demo expired. Reload to start a new workspace.",
        401,
      );
    rateLimit(id);
    const reader = request.body?.getReader();
    if (!reader) throw new AppError("A request body is required.");
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 32000) {
        await reader.cancel();
        throw new AppError("The request is too large.", 413);
      }
      chunks.push(value);
    }
    let body: unknown;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new AppError("Invalid JSON.");
    }
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success)
      throw new AppError(
        parsed.error.issues[0]?.message ||
          "Check the information and try again.",
      );
    // Read after the asynchronous body read so concurrent requests cannot overwrite a stale snapshot.
    const latest = getWorkspace(id);
    if (!latest)
      throw new AppError(
        "Your demo expired. Reload to start a new workspace.",
        401,
      );
    const output = applyAction(id, latest, parsed.data);
    saveWorkspace(id, output.state);
    return NextResponse.json(output, { headers });
  } catch (error) {
    return failure(error);
  }
}
