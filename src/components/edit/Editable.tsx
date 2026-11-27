"use client";

import {
  createElement,
  useLayoutEffect,
  useRef,
  useState,
  type ElementType,
  type MouseEvent,
  type ReactNode,
} from "react";
import { fallbackFor, t } from "@/lib/i18n";
import { getAt } from "@/lib/content";
import type { L, Path } from "@/lib/types";
import { useSite, type SettingsSpec, type UploadKind } from "@/components/site/SiteContext";

/* ───────────────────────── Text ───────────────────────── */

interface TextProps {
  path: Path;
  as?: ElementType;
  className?: string;
  multiline?: boolean;
  /** Shown in the editor when there is no text in any language. */
  placeholder?: string;
}

/**
 * Localized text. On the site it renders the current language (with fallback);
 * in the admin panel it becomes editable in place for the selected language.
 */
export function T({ path, as = "span", className, multiline, placeholder }: TextProps) {
  const { content, locale, edit } = useSite();
  const value = getAt<L | undefined>(content, path);
  if (!edit) {
    const s = t(value, locale);
    return s ? createElement(as, { className }, s) : null;
  }
  return (
    <EditableText
      as={as}
      className={className}
      multiline={multiline}
      value={value?.[locale] ?? ""}
      placeholder={fallbackFor(value, locale) || placeholder || "Введите текст"}
      onChange={(v) => edit.setText(path, v)}
    />
  );
}

/** Plain (not localized) string field, e.g. a year. */
export function Raw({ path, as = "span", className, placeholder }: TextProps) {
  const { content, edit } = useSite();
  const value = getAt<string | undefined>(content, path) ?? "";
  if (!edit) return value ? createElement(as, { className }, value) : null;
  return (
    <EditableText
      as={as}
      className={className}
      value={value}
      placeholder={placeholder ?? "—"}
      onChange={(v) => edit.update(path, v)}
    />
  );
}

function EditableText({
  as,
  className,
  value,
  placeholder,
  multiline,
  onChange,
}: {
  as: ElementType;
  className?: string;
  value: string;
  placeholder: string;
  multiline?: boolean;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLElement>(null);

  // The element is uncontrolled while focused so the caret never jumps.
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && el.innerText !== value) el.innerText = value;
  });

  const read = (el: HTMLElement) => {
    let v = el.innerText.replace(/ /g, " ");
    if (!multiline) v = v.replace(/\s*\n\s*/g, " ");
    return v.trim() === "" ? "" : v;
  };

  const Tag = as;
  return (
    <Tag
      ref={ref}
      className={[className, "ed-text", value ? "" : "ed-empty"].filter(Boolean).join(" ")}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      spellCheck
      data-placeholder={placeholder}
      onInput={(e: React.FormEvent<HTMLElement>) => onChange(read(e.currentTarget))}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        const v = read(e.currentTarget).trim();
        if (v !== value) onChange(v);
        if (e.currentTarget.innerText !== v) e.currentTarget.innerText = v;
      }}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === "Enter" && !multiline) {
          e.preventDefault();
          e.currentTarget.blur();
        }
        if (e.key === "Escape") e.currentTarget.blur();
      }}
      onPaste={(e: React.ClipboardEvent<HTMLElement>) => {
        e.preventDefault();
        let text = e.clipboardData.getData("text/plain");
        if (!multiline) text = text.replace(/\s*\n\s*/g, " ");
        document.execCommand("insertText", false, text);
      }}
      onClick={(e: MouseEvent) => e.stopPropagation()}
    />
  );
}

/* ───────────────────────── Images ───────────────────────── */

export function Img({ src, alt, className }: { src: string | null | undefined; alt: string; className?: string }) {
  const { asset, edit } = useSite();
  const resolved = asset(src);
  const [failed, setFailed] = useState<string | null>(null);
  if (!src) return null;
  // In the editor a just-published file may not be deployed yet: fetch it from the repo instead.
  const url =
    edit && failed === resolved && src.startsWith("/uploads/")
      ? `/api/admin/file?path=${encodeURIComponent(src)}`
      : resolved;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => edit && setFailed(resolved)}
    />
  );
}

/** Image with "upload / replace / remove" controls in the editor. */
export function EditableImage({
  path,
  kind,
  alt,
  className,
  imgClassName,
  empty,
  removable = true,
}: {
  path: Path;
  kind: UploadKind;
  alt: string;
  className?: string;
  imgClassName?: string;
  empty?: ReactNode;
  removable?: boolean;
}) {
  const { content, edit } = useSite();
  const src = getAt<string | null>(content, path);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const pick = async (file: File | undefined) => {
    if (!file || !edit) return;
    setBusy(true);
    try {
      edit.update(path, await edit.upload(file, kind));
    } catch (e) {
      edit.notify((e as Error).message, "error");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className={[className, edit ? "ed-image" : ""].filter(Boolean).join(" ")}>
      {src ? <Img src={src} alt={alt} className={imgClassName} /> : empty}
      {edit && (
        <div className="ed-image__bar" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="ed-btn" onClick={() => input.current?.click()} disabled={busy}>
            {busy ? "Загрузка…" : src ? "Заменить" : "Загрузить"}
          </button>
          {src && removable && (
            <button type="button" className="ed-btn" onClick={() => edit.update(path, null)}>
              Убрать
            </button>
          )}
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            hidden
            onChange={(e) => pick(e.target.files?.[0])}
          />
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Lists ───────────────────────── */

export function ItemTools({
  listPath,
  index,
  length,
  settings,
  what = "элемент",
}: {
  listPath: Path;
  index: number;
  length: number;
  settings?: SettingsSpec;
  what?: string;
}) {
  const { edit } = useSite();
  if (!edit) return null;
  return (
    <div className="ed-tools" onClick={(e) => e.stopPropagation()}>
      <button type="button" title="Выше" disabled={index === 0} onClick={() => edit.listMove(listPath, index, -1)}>
        ↑
      </button>
      <button
        type="button"
        title="Ниже"
        disabled={index === length - 1}
        onClick={() => edit.listMove(listPath, index, 1)}
      >
        ↓
      </button>
      {settings && (
        <button type="button" title="Настройки" onClick={() => edit.openSettings(settings)}>
          ⚙
        </button>
      )}
      <button
        type="button"
        title="Удалить"
        className="ed-tools__danger"
        onClick={() => edit.listRemove(listPath, index, `Удалить ${what}? Это действие затронет все языки.`)}
      >
        ✕
      </button>
    </div>
  );
}

export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  const { edit } = useSite();
  if (!edit) return null;
  return (
    <button type="button" className="ed-add" onClick={onClick}>
      <span aria-hidden>+</span> {label}
    </button>
  );
}

/** Small "⚙ settings" button for things that are not list items. */
export function SettingsButton({ spec, label = "Настройки" }: { spec: SettingsSpec; label?: string }) {
  const { edit } = useSite();
  if (!edit) return null;
  return (
    <button
      type="button"
      className="ed-btn ed-btn--ghost"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        edit.openSettings(spec);
      }}
    >
      ⚙ {label}
    </button>
  );
}
