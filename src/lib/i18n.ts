import { LOCALES, type L, type Locale } from "./types";

export { LOCALES };
export type { Locale };

export const DEFAULT_LOCALE: Locale = "en";
export const LANG_COOKIE = "lang";

export const LOCALE_LABELS: Record<Locale, string> = { ru: "RU", en: "EN", ko: "KO" };
export const LOCALE_NAMES: Record<Locale, string> = {
  ru: "Русский",
  en: "English",
  ko: "한국어",
};

/** Order in which a missing translation falls back to another language. */
const FALLBACK: Record<Locale, Locale[]> = {
  ru: ["ru", "en", "ko"],
  en: ["en", "ru", "ko"],
  ko: ["ko", "en", "ru"],
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Text in the requested language, or the nearest available translation. */
export function t(value: L | undefined | null, locale: Locale): string {
  if (!value) return "";
  for (const l of FALLBACK[locale]) {
    const s = value[l];
    if (s && s.trim()) return s;
  }
  return "";
}

/** The fallback a visitor would see if this language were left empty. */
export function fallbackFor(value: L | undefined | null, locale: Locale): string {
  if (!value) return "";
  for (const l of FALLBACK[locale].slice(1)) {
    const s = value[l];
    if (s && s.trim()) return s;
  }
  return "";
}

const RU_LIKE = new Set(["ru", "uk", "be", "kk", "ky", "uz", "tg", "hy", "az", "ka"]);

/**
 * Picks the site language for a first-time visitor:
 * saved choice → visitor from Korea → browser languages → English.
 */
export function detectLocale(opts: {
  cookie?: string | null;
  country?: string | null;
  acceptLanguage?: string | null;
}): Locale {
  if (isLocale(opts.cookie)) return opts.cookie;
  if (opts.country?.toUpperCase() === "KR") return "ko";

  const prefs = (opts.acceptLanguage ?? "")
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: tag.toLowerCase(), q: q ? Number(q.trim().slice(2)) || 0 : 1 };
    })
    .filter((p) => p.tag)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of prefs) {
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
    if (RU_LIKE.has(base)) return "ru";
  }
  return DEFAULT_LOCALE;
}

const DATE_LOCALES: Record<Locale, string> = { ru: "ru-RU", en: "en-GB", ko: "ko-KR" };

/** "2026-09" → "сентябрь 2026" / "September 2026" / "2026년 9월" */
export function formatMonth(date: string, locale: Locale): string {
  const m = /^(\d{4})(?:-(\d{1,2}))?/.exec(date ?? "");
  if (!m) return date ?? "";
  if (!m[2]) return m[1];
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1));
  const out = new Intl.DateTimeFormat(DATE_LOCALES[locale], {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
  // Russian gives "сентябрь 2026 г." — drop the trailing "г."
  return out.replace(/\s?г\.$/, "");
}
