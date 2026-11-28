"use client";

import { useEffect, useRef, useState } from "react";
import { LOCALES, LOCALE_NAMES } from "@/lib/i18n";
import { getAt } from "@/lib/content";
import type { Locale } from "@/lib/types";
import { useSite, type FieldSpec, type SettingsSpec } from "@/components/site/SiteContext";
import { Img } from "@/components/edit/Editable";

export function SettingsDialog({ spec, onClose }: { spec: SettingsSpec; onClose: () => void }) {
  const { content } = useSite();
  const item = getAt<Record<string, unknown> | undefined>(content, spec.path);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("input, select, button")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // The item was deleted or moved away.
  if (!item) return null;

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label={spec.title} ref={ref}>
        <div className="dialog__head">
          <h2>{spec.title}</h2>
          <button type="button" className="admin-btn admin-btn--icon" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>
        <p className="dialog__note">Изменения применяются сразу и попадут на сайт после «Опубликовать».</p>
        <div className="dialog__body">
          {spec.fields(content).map((f) => (
            <Field key={f.key} field={f} spec={spec} value={item[f.key]} />
          ))}
        </div>
        <div className="dialog__foot">
          <button type="button" className="admin-btn admin-btn--primary" onClick={onClose}>
            Готово
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ field, spec, value }: { field: FieldSpec; spec: SettingsSpec; value: unknown }) {
  const { edit } = useSite();
  const set = (v: unknown) => edit?.update([...spec.path, field.key], v);

  switch (field.type) {
    case "text":
      return (
        <label className="field">
          <span className="field__label">{field.label}</span>
          <input
            className="field__input"
            value={(value as string) ?? ""}
            placeholder={field.placeholder}
            onChange={(e) => set(e.target.value)}
          />
          {field.hint && <span className="field__hint">{field.hint}</span>}
        </label>
      );
    case "month":
      return (
        <label className="field">
          <span className="field__label">{field.label}</span>
          <input
            type="month"
            className="field__input"
            value={((value as string) ?? "").slice(0, 7)}
            onChange={(e) => set(e.target.value)}
          />
        </label>
      );
    case "select":
      return (
        <label className="field">
          <span className="field__label">{field.label}</span>
          <select className="field__input" value={(value as string) ?? ""} onChange={(e) => set(e.target.value)}>
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      );
    case "checkbox":
      return (
        <label className="field field--check">
          <input type="checkbox" checked={!!value} onChange={(e) => set(e.target.checked)} />
          <span>{field.label}</span>
        </label>
      );
    case "links": {
      const links = (value as Partial<Record<Locale, string>>) ?? {};
      return (
        <fieldset className="field">
          <legend className="field__label">{field.label}</legend>
          {LOCALES.map((l) => (
            <label key={l} className="field__row">
              <span className="field__tag">{l.toUpperCase()}</span>
              <input
                className="field__input"
                type="url"
                placeholder={`https://… (${LOCALE_NAMES[l]})`}
                value={links[l] ?? ""}
                onChange={(e) => {
                  const next = { ...links, [l]: e.target.value };
                  if (!e.target.value) delete next[l];
                  set(next);
                }}
              />
            </label>
          ))}
          <span className="field__hint">На карточке появятся кнопки RU / EN / KO для каждой заполненной ссылки.</span>
        </fieldset>
      );
    }
    case "image":
      return <UploadField label={field.label} value={value as string | null} kind={field.kind} onChange={set} image />;
    case "file":
      return (
        <UploadField label={field.label} value={value as string | null} kind="files" onChange={set} hint={field.hint} />
      );
    case "note":
      return (
        <div className="field field--note">
          {field.label && <span className="field__label">{field.label}</span>}
          <p className="field__hint">{field.text}</p>
          {field.code && field.code.length > 0 && (
            <ul className="field__codes">
              {field.code.map((c) => (
                <li key={c}>
                  <code>{c}</code>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
  }
}

function UploadField({
  label,
  value,
  kind,
  onChange,
  image,
  hint,
}: {
  label: string;
  value: string | null;
  kind: "photo" | "covers" | "certificates" | "files";
  onChange: (v: string | null) => void;
  image?: boolean;
  hint?: string;
}) {
  const { edit } = useSite();
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const pick = async (file?: File) => {
    if (!file || !edit) return;
    setBusy(true);
    try {
      onChange(await edit.upload(file, kind));
    } catch (e) {
      edit.notify((e as Error).message, "error");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="field">
      <span className="field__label">{label}</span>
      {value && image && (
        <div className="field__preview">
          <Img src={value} alt="" />
        </div>
      )}
      {value && !image && <span className="field__file">{value.split("/").pop()}</span>}
      <div className="field__actions">
        <button type="button" className="admin-btn" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? "Загрузка…" : value ? "Заменить файл" : "Выбрать файл"}
        </button>
        {value && (
          <button type="button" className="admin-btn" onClick={() => onChange(null)}>
            Убрать
          </button>
        )}
      </div>
      {hint && <span className="field__hint">{hint}</span>}
      <input
        ref={input}
        type="file"
        hidden
        accept={image ? "image/jpeg,image/png,image/webp,image/avif" : ".pdf,.doc,.docx,.zip,.ppt,.pptx,.xls,.xlsx,.txt,.rtf,image/*"}
        onChange={(e) => pick(e.target.files?.[0])}
      />
    </div>
  );
}
