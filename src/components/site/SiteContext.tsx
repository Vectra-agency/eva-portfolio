"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Content, Locale, Path } from "@/lib/types";

export type Page = "home" | "certificates";
export type UploadKind = "photo" | "covers" | "certificates" | "files";

export type FieldSpec =
  | { type: "text"; key: string; label: string; placeholder?: string; hint?: string }
  | { type: "month"; key: string; label: string }
  | { type: "select"; key: string; label: string; options: { value: string; label: string }[] }
  | { type: "checkbox"; key: string; label: string }
  | { type: "image"; key: string; label: string; kind: UploadKind }
  | { type: "file"; key: string; label: string; hint?: string }
  | { type: "links"; key: string; label: string };

export interface SettingsSpec {
  title: string;
  path: Path;
  fields: (content: Content) => FieldSpec[];
}

/** Only present inside the admin panel. */
export interface EditApi {
  update(path: Path, value: unknown): void;
  /** Sets the text for the language currently being edited. */
  setText(path: Path, value: string): void;
  listAdd(path: Path, item: unknown, index?: number): void;
  listRemove(path: Path, index: number, confirmText?: string): void;
  listMove(path: Path, index: number, dir: -1 | 1): void;
  upload(file: File, kind: UploadKind): Promise<string>;
  openSettings(spec: SettingsSpec): void;
  setLocale(locale: Locale): void;
  goto(page: Page, hash?: string): void;
  notify(text: string, kind?: "info" | "error"): void;
}

interface SiteContextValue {
  content: Content;
  locale: Locale;
  page: Page;
  edit: EditApi | null;
  /** Resolves an uploaded file path to a URL the browser can load. */
  asset(path: string | null | undefined): string;
  href(page: Page, locale?: Locale): string;
}

const Ctx = createContext<SiteContextValue | null>(null);

export function useSite(): SiteContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSite outside SiteProvider");
  return v;
}

export function pageHref(page: Page, locale: Locale) {
  return page === "home" ? `/${locale}` : `/${locale}/certificates`;
}

export function SiteProvider({
  content,
  locale,
  page,
  edit = null,
  asset,
  children,
}: {
  content: Content;
  locale: Locale;
  page: Page;
  edit?: EditApi | null;
  asset?: (path: string | null | undefined) => string;
  children: ReactNode;
}) {
  const value = useMemo<SiteContextValue>(
    () => ({
      content,
      locale,
      page,
      edit,
      asset: asset ?? ((p) => p ?? ""),
      href: (target, l = locale) => pageHref(target, l),
    }),
    [content, locale, page, edit, asset],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
