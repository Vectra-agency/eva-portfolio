import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { cacheLife, cacheTag } from "next/cache";
import bundled from "@content/content.json";
import type { Content } from "@/lib/types";

export const CONTENT_TAG = "site-content";

/**
 * Site content as of now, so a publish from the editor shows up without a rebuild:
 * - `next dev`: the JSON is part of the module graph, so any change to it hot-reloads;
 * - `next start`: read from disk and cached; a local publish calls revalidateTag(CONTENT_TAG);
 * - Vercel: prerendered at build time; every publish is a commit, which redeploys.
 */
export async function getSiteContent(): Promise<Content> {
  "use cache";
  cacheTag(CONTENT_TAG);
  cacheLife("max");
  if (process.env.NODE_ENV === "development") return bundled as Content;
  const raw = await fs.readFile(path.join(process.cwd(), "content", "content.json"), "utf8");
  return JSON.parse(raw) as Content;
}
