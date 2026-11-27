import type { NextRequest } from "next/server";
import { isAuthed, unauthorized } from "@/lib/server/auth";
import { MIME, extOf, readStoredFile } from "@/lib/server/storage";

/** Admin-only preview of uploads: ?sha=<blob sha>&path=/uploads/... (path is used for the type). */
export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return unauthorized();
  const sha = req.nextUrl.searchParams.get("sha") ?? undefined;
  const path = req.nextUrl.searchParams.get("path") ?? undefined;
  if (!path?.startsWith("/uploads/") || path.includes("..")) {
    return Response.json({ error: "bad path" }, { status: 400 });
  }
  if (sha && !/^[0-9a-f]{40}$/.test(sha)) return Response.json({ error: "bad sha" }, { status: 400 });

  try {
    const bytes = await readStoredFile({ sha, path });
    const type = MIME[extOf(path)] ?? "application/octet-stream";
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "private, max-age=300",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("not found", { status: 404 });
  }
}
