import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { cacheLife, cacheTag } from "next/cache";
import bundled from "@content/content.json";
import { designFromSegment, designOf } from "@/lib/content";
import type { Content, Design } from "@/lib/types";

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

/**
 * The design of a page from its URL segment ("_" = the one chosen in the editor).
 * `named` is the design written in the URL, kept in links so visitors stay on it; null for "_".
 */
export async function pageDesign(segment: string): Promise<{ design: Design; named: Design | null } | null> {
  const named = designFromSegment(segment);
  if (named === undefined) return null;
  return { design: named ?? designOf(await getSiteContent()), named };
}
