import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { isAuthed, unauthorized } from "@/lib/server/auth";
import { looksLikeContent } from "@/lib/content";
import { publishContent, storageMode, type PendingFile } from "@/lib/server/storage";
import { CONTENT_TAG } from "@/lib/server/site-content";

export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return unauthorized();
  if (storageMode() === "unconfigured") {
    return Response.json({ error: "Не настроено хранилище: задайте GITHUB_TOKEN и GITHUB_REPO." }, { status: 500 });
  }
  let body: { content?: unknown; pending?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Некорректный запрос" }, { status: 400 });
  }
  if (!looksLikeContent(body.content)) {
    return Response.json({ error: "Содержимое повреждено — публикация отменена" }, { status: 400 });
  }
  const pending: PendingFile[] = Array.isArray(body.pending)
    ? body.pending.filter(
        (p): p is PendingFile =>
          !!p && typeof (p as PendingFile).repoPath === "string" && typeof (p as PendingFile).sha === "string",
      )
    : [];

  try {
    const result = await publishContent(body.content, pending);
    // Local files changed: the next visit re-reads them. (With GitHub the redeploy does this.)
    if (storageMode() === "local") revalidateTag(CONTENT_TAG, { expire: 0 });
    return Response.json({ ok: true, mode: storageMode(), ...result });
  } catch (e) {
    console.error(e);
    return Response.json({ error: `Не удалось опубликовать: ${(e as Error).message}` }, { status: 502 });
  }
}
