import { NextResponse } from "next/server";
import { z } from "zod";
import { identity } from "@/lib/team/auth";
import { database } from "@/lib/team/database";
import { limitRequests } from "@/lib/team/service";
import {
  saveConnection,
  disconnect,
  driveRequest,
  boundedText,
  importDriveText,
} from "@/lib/team/drive";
import { failure, jsonBody } from "@/lib/http";
import { AppError } from "@/lib/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const schema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("connect"),
    teamId: z.uuid(),
    accessToken: z.string().min(10).max(4096),
    refreshToken: z.string().min(10).max(4096).optional(),
  }),
  z.object({ operation: z.literal("disconnect"), teamId: z.uuid() }),
  z.object({
    operation: z.literal("list"),
    teamId: z.uuid(),
    pageToken: z.string().max(2000).optional(),
  }),
  z.object({
    operation: z.literal("import"),
    teamId: z.uuid(),
    fileId: z.string().regex(/^[a-zA-Z0-9_-]{5,200}$/),
  }),
]);
export async function POST(request: Request) {
  try {
    const user = await identity(request);
    const db = database();
    await limitRequests(db, user.id);
    const parsed = schema.safeParse(await jsonBody(request));
    if (!parsed.success) throw new AppError("Invalid Drive request.");
    const input = parsed.data;
    let output: unknown;
    if (input.operation === "connect") {
      await saveConnection(db, user, input.teamId, {
        accessToken: input.accessToken,
        refreshToken: input.refreshToken,
        expiresAt: Date.now() + 45 * 60000,
      });
      output = { connected: true };
    } else if (input.operation === "disconnect") {
      await disconnect(db, user, input.teamId);
      output = { connected: false };
    } else if (input.operation === "list") {
      const params = new URLSearchParams({
        q: "trashed=false and (mimeType='application/vnd.google-apps.document' or mimeType='text/plain' or mimeType='text/markdown')",
        fields: "files(id,name,mimeType),nextPageToken",
        pageSize: "25",
        orderBy: "modifiedTime desc",
        ...(input.pageToken ? { pageToken: input.pageToken } : {}),
      });
      const response = await driveRequest(
        db,
        user,
        input.teamId,
        `files?${params}`,
      );
      output = await response.json();
    } else {
      const metadata = await (
        await driveRequest(
          db,
          user,
          input.teamId,
          `files/${input.fileId}?fields=id,name,mimeType,trashed`,
        )
      ).json();
      if (metadata.trashed) throw new AppError("The source is in the trash.");
      if (
        ![
          "application/vnd.google-apps.document",
          "text/plain",
          "text/markdown",
        ].includes(metadata.mimeType)
      )
        throw new AppError(
          "Only Google Docs and plain text/Markdown files are supported.",
        );
      const path =
        metadata.mimeType === "application/vnd.google-apps.document"
          ? `files/${input.fileId}/export?mimeType=text%2Fplain`
          : `files/${input.fileId}?alt=media`;
      const content = await boundedText(
        await driveRequest(db, user, input.teamId, path),
      );
      output = await importDriveText(db, user, input.teamId, {
        id: input.fileId,
        name: metadata.name,
        content,
      });
    }
    return NextResponse.json(output, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return failure(error);
  }
}
