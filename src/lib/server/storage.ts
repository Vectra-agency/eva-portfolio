import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { collectUploads } from "@/lib/content";
import type { Content } from "@/lib/types";
import { commitChanges, createBlob, getBlob, getRawFile, githubConfig, type TreeChange } from "./github";

/**
 * github       — production: content and files are committed to the repo, Vercel redeploys.
 * local        — `npm run dev` without a token: files are written straight into the project.
 * unconfigured — deployed without GitHub settings, saving is impossible.
 */
export type StorageMode = "github" | "local" | "unconfigured";

export function storageMode(): StorageMode {
  const { token, repo } = githubConfig();
  if (token && repo) return "github";
  if (process.env.VERCEL) return "unconfigured";
  return "local";
}

export const CONTENT_FILE = "content/content.json";
export const UPLOADS_DIR = "public/uploads";
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const ROOT = process.cwd();

export const UPLOAD_KINDS = ["photo", "covers", "certificates", "files"] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

const IMAGE_EXT = ["jpg", "jpeg", "png", "webp", "gif", "avif"];
const DOC_EXT = ["pdf", "doc", "docx", "zip", "ppt", "pptx", "xls", "xlsx", "txt", "rtf"];

export const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  zip: "application/zip",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain; charset=utf-8",
  rtf: "application/rtf",
};

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

function slugify(name: string): string {
  const s = name
    .toLowerCase()
    .split("")
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return s || "file";
}

export function extOf(name: string): string {
  return (name.split(".").pop() ?? "").toLowerCase();
}

export function validateUpload(name: string, kind: string, size: number): string | null {
  if (!(UPLOAD_KINDS as readonly string[]).includes(kind)) return "Неизвестный тип загрузки";
  const ext = extOf(name);
  const allowed = kind === "files" ? [...DOC_EXT, ...IMAGE_EXT] : IMAGE_EXT;
  if (!allowed.includes(ext)) return `Формат .${ext || "?"} не поддерживается`;
  if (size === 0) return "Пустой файл";
  if (size > MAX_UPLOAD_BYTES) return "Файл больше 4 МБ — загрузите его в облако и вставьте ссылку";
  return null;
}

function newUploadPath(name: string, kind: UploadKind) {
  const ext = extOf(name);
  const base = slugify(name.replace(/\.[^.]+$/, ""));
  const rand = Math.random().toString(36).slice(2, 8);
  const publicPath = `/uploads/${kind}/${base}-${rand}.${ext}`;
  return { publicPath, repoPath: `public${publicPath}` };
}

export interface UploadResult {
  path: string;
  repoPath: string;
  sha?: string;
}

export async function storeUpload(name: string, kind: UploadKind, bytes: Buffer): Promise<UploadResult> {
  const { publicPath, repoPath } = newUploadPath(name, kind);
  if (storageMode() === "github") {
    const sha = await createBlob(bytes);
    return { path: publicPath, repoPath, sha };
  }
  const abs = path.join(/*turbopackIgnore: true*/ ROOT, repoPath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, bytes);
  return { path: publicPath, repoPath };
}

export async function loadContent(): Promise<Content> {
  if (storageMode() === "github") {
    const buf = await getRawFile(CONTENT_FILE);
    return JSON.parse(Buffer.from(buf).toString("utf8")) as Content;
  }
  return JSON.parse(await fs.readFile(path.join(ROOT, CONTENT_FILE), "utf8")) as Content;
}

const SAFE_REPO_PATH = /^public\/uploads\/[a-z0-9_-]+\/[a-z0-9._-]+$/;

export interface PendingFile {
  repoPath: string;
  sha: string;
}

/** Saves content, attaches files uploaded since the last publish and drops files no longer used. */
export async function publishContent(content: Content, pending: PendingFile[]): Promise<{ commit?: string }> {
  const json = JSON.stringify(content, null, 2) + "\n";
  const used = new Set([...collectUploads(content)].map((p) => `public${p}`));

  if (storageMode() === "github") {
    const stamp = new Date().toISOString().replace("T", " ").slice(0, 16);
    const commit = await commitChanges(`content: update from admin (${stamp} UTC)`, (existing) => {
      const existingSet = new Set(existing);
      const changes: TreeChange[] = [{ path: CONTENT_FILE, content: json }];
      for (const f of pending) {
        if (used.has(f.repoPath) && SAFE_REPO_PATH.test(f.repoPath) && /^[0-9a-f]{40}$/.test(f.sha)) {
          changes.push({ path: f.repoPath, sha: f.sha });
        }
      }
      for (const p of existing) {
        if (p.startsWith(`${UPLOADS_DIR}/`) && !used.has(p) && !p.endsWith(".gitkeep")) {
          changes.push({ path: p, delete: true });
        }
      }
      // Never point the content at a file that will not exist after the commit.
      const added = new Set(changes.filter((c) => "sha" in c).map((c) => c.path));
      for (const p of used) {
        if (!existingSet.has(p) && !added.has(p)) {
          throw new Error(`Файл ${p} не найден — загрузите его заново`);
        }
      }
      return changes;
    });
    return { commit };
  }

  await fs.writeFile(path.join(ROOT, CONTENT_FILE), json, "utf8");
  await removeUnusedLocal(path.join(/*turbopackIgnore: true*/ ROOT, UPLOADS_DIR), used);
  return {};
}

async function removeUnusedLocal(dir: string, used: Set<string>) {
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const abs = path.join(/*turbopackIgnore: true*/ dir, e.name);
    if (e.isDirectory()) {
      await removeUnusedLocal(abs, used);
      continue;
    }
    const rel = path.relative(ROOT, abs).split(path.sep).join("/");
    if (!used.has(rel) && e.name !== ".gitkeep") await fs.unlink(abs);
  }
}

/** File bytes for previews inside the admin panel (works before the redeploy finishes). */
export async function readStoredFile(opts: { sha?: string; path?: string }): Promise<Buffer> {
  if (storageMode() === "github") {
    if (opts.sha) return Buffer.from(await getBlob(opts.sha));
    return Buffer.from(await getRawFile(`public${opts.path}`));
  }
  const rel = path.normalize(`public${opts.path ?? ""}`);
  if (!rel.startsWith(`public${path.sep}uploads${path.sep}`)) throw new Error("bad path");
  return fs.readFile(path.join(/*turbopackIgnore: true*/ ROOT, rel));
}
