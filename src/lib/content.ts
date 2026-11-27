import { DEFAULT_DESIGN, DESIGNS, type Content, type Design, type Path } from "./types";

export function designOf(content: Pick<Content, "design">): Design {
  return (DESIGNS as readonly string[]).includes(content.design ?? "") ? content.design! : DEFAULT_DESIGN;
}

/** Reads a nested value by path, e.g. ["experience", 0, "role"]. */
export function getAt<T = unknown>(obj: unknown, path: Path): T {
  let cur: unknown = obj;
  for (const key of path) {
    if (cur == null) return undefined as T;
    cur = (cur as Record<string | number, unknown>)[key];
  }
  return cur as T;
}

/** Returns a copy of `obj` with the value at `path` replaced (structural sharing). */
export function setAt<T>(obj: T, path: Path, value: unknown): T {
  if (path.length === 0) return value as T;
  const [key, ...rest] = path;
  const base = (obj ?? (typeof key === "number" ? [] : {})) as Record<string | number, unknown>;
  const copy = (Array.isArray(base) ? [...base] : { ...base }) as Record<string | number, unknown>;
  copy[key] = setAt(base[key], rest, value);
  return copy as T;
}

export function uid(prefix = "id"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Every "/uploads/..." path the content refers to. */
export function collectUploads(content: Content): Set<string> {
  const found = new Set<string>();
  const walk = (v: unknown) => {
    if (typeof v === "string") {
      if (v.startsWith("/uploads/")) found.add(v);
    } else if (Array.isArray(v)) {
      v.forEach(walk);
    } else if (v && typeof v === "object") {
      Object.values(v).forEach(walk);
    }
  };
  walk(content);
  return found;
}

/** Cheap structural check before accepting content from the admin panel. */
export function looksLikeContent(value: unknown): value is Content {
  if (!value || typeof value !== "object") return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.hero === "object" &&
    typeof c.sections === "object" &&
    Array.isArray(c.experience) &&
    typeof c.publications === "object" &&
    Array.isArray(c.education) &&
    typeof c.certificates === "object" &&
    Array.isArray(c.achievements) &&
    Array.isArray(c.recommendations) &&
    Array.isArray(c.contacts) &&
    Array.isArray(c.downloads) &&
    typeof c.ui === "object"
  );
}

export function contactHref(type: string, value: string): string {
  const v = value.trim();
  if (!v) return "";
  if (type === "email") return v.startsWith("mailto:") ? v : `mailto:${v}`;
  if (type === "phone") return v.startsWith("tel:") ? v : `tel:${v.replace(/[^\d+]/g, "")}`;
  if (/^https?:\/\//i.test(v) || v.startsWith("/")) return v;
  return `https://${v}`;
}

/** "https://www.linkedin.com/in/example/" → "linkedin.com/in/example" */
export function prettyValue(type: string, value: string): string {
  const v = value.trim();
  if (type === "email" || type === "phone") return v.replace(/^(mailto|tel):/, "");
  return v.replace(/^https?:\/\//i, "").replace(/^www\./, "").replace(/\/$/, "");
}
