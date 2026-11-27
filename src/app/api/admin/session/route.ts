import type { NextRequest } from "next/server";
import { isAuthed, passwordConfigured } from "@/lib/server/auth";
import { storageMode } from "@/lib/server/storage";

export async function GET(req: NextRequest) {
  return Response.json(
    { authed: isAuthed(req), mode: storageMode(), passwordConfigured: passwordConfigured() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
