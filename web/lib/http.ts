import { NextResponse } from "next/server";
import { AppError } from "./store";
export function failure(error: unknown) {
  return NextResponse.json(
    {
      error:
        error instanceof AppError
          ? error.message
          : "Unable to complete this request.",
    },
    {
      status: error instanceof AppError ? error.status : 500,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
export async function jsonBody(
  request: Request,
  max = 32000,
): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new AppError("Expected JSON.", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new AppError("Request body required.");
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.length;
    if (bytes > max) {
      await reader.cancel();
      throw new AppError("Request is too large.", 413);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new AppError("Invalid JSON.");
  }
}
