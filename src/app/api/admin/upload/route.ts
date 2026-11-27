import type { NextRequest } from "next/server";
import { isAuthed, unauthorized } from "@/lib/server/auth";
import { MAX_UPLOAD_BYTES, storageMode, storeUpload, validateUpload, type UploadKind } from "@/lib/server/storage";

/** Body: raw file bytes. Query: ?name=<original file name>&kind=<photo|covers|certificates|files> */
export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return unauthorized();
  if (storageMode() === "unconfigured") {
    return Response.json({ error: "Не настроено хранилище: задайте GITHUB_TOKEN и GITHUB_REPO." }, { status: 500 });
  }
  const name = req.nextUrl.searchParams.get("name") ?? "";
  const kind = req.nextUrl.searchParams.get("kind") ?? "";
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_BYTES) {
    return Response.json({ error: "Файл больше 4 МБ — загрузите его в облако и вставьте ссылку" }, { status: 413 });
  }
  const bytes = Buffer.from(await req.arrayBuffer());
  const problem = validateUpload(name, kind, bytes.length);
  if (problem) return Response.json({ error: problem }, { status: 400 });

  try {
    return Response.json(await storeUpload(name, kind as UploadKind, bytes));
  } catch (e) {
    console.error(e);
    return Response.json({ error: `Не удалось сохранить файл: ${(e as Error).message}` }, { status: 502 });
  }
}
