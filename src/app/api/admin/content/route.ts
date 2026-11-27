import type { NextRequest } from "next/server";
import { isAuthed, unauthorized } from "@/lib/server/auth";
import { loadContent, storageMode } from "@/lib/server/storage";

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return unauthorized();
  try {
    const content = await loadContent();
    return Response.json({ content, mode: storageMode() }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return Response.json({ error: `Не удалось загрузить контент: ${(e as Error).message}` }, { status: 502 });
  }
}
