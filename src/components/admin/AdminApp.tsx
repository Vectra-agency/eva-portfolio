"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LOCALES, LOCALE_NAMES } from "@/lib/i18n";
import { designOf, getAt, setAt } from "@/lib/content";
import { compressImage } from "@/lib/image";
import { DESIGNS, type Content, type Design, type Locale, type Path } from "@/lib/types";
import {
  SiteProvider,
  pageHref,
  type EditApi,
  type Page,
  type SettingsSpec,
  type UploadKind,
} from "@/components/site/SiteContext";
import { CertificatesPage, HomePage } from "@/components/site/Pages";
import { SettingsDialog } from "./SettingsDialog";

type Mode = "github" | "local" | "unconfigured";
interface Session {
  authed: boolean;
  mode: Mode;
  passwordConfigured: boolean;
}

const DRAFT_KEY = "eva-admin-draft-v1";

const DESIGN_LABELS: Record<Design, { label: string; hint: string }> = {
  minimal: { label: "Минимал", hint: "Белый фон, одна колонка — как в исходном макете" },
  editorial: { label: "Журнал", hint: "Тёплая бумага, антиква, редакционная вёрстка" },
  studio: { label: "Студия", hint: "Тёмный, крупные градиентные заголовки, «живой» портрет" },
};
const LOCALE_KEY = "eva-admin-locale";

/** Files uploaded in this session but not yet committed, keyed by public path. */
type Pending = Record<string, { repoPath: string; sha: string }>;

interface Draft {
  content: Content;
  pending: Pending;
  savedAt: number;
}

function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function writeDraft(d: Draft | null) {
  try {
    if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    else localStorage.removeItem(DRAFT_KEY);
  } catch {}
}

export function AdminApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState("");
  const loggedOut = useCallback(() => setSession((s) => (s ? { ...s, authed: false } : s)), []);

  useEffect(() => {
    fetch("/api/admin/session", { cache: "no-store" })
      .then((r) => r.json())
      .then(setSession)
      .catch(() => setError("Не удалось связаться с сервером"));
  }, []);

  if (error) return <div className="admin-center">{error}</div>;
  if (!session) return <div className="admin-center admin-loading">Загрузка…</div>;
  if (!session.authed)
    return (
      <Login
        passwordConfigured={session.passwordConfigured}
        onSuccess={() => setSession({ ...session, authed: true })}
      />
    );
  return <Editor mode={session.mode} onLogout={loggedOut} />;
}

/* ───────────────────────── Login ───────────────────────── */

function Login({ onSuccess, passwordConfigured }: { onSuccess: () => void; passwordConfigured: boolean }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    passwordConfigured ? "" : "На сервере не задан ADMIN_PASSWORD — добавьте его в настройки окружения.",
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok) onSuccess();
      else setError(data.error ?? "Не удалось войти");
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-center">
      <form className="login" onSubmit={submit}>
        <p className="login__eyebrow">Eva Rovenskaia</p>
        <h1 className="login__title">Редактор портфолио</h1>
        <label className="field">
          <span className="field__label">Пароль</span>
          <input
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field__input"
          />
        </label>
        {error && <p className="login__error">{error}</p>}
        <button className="admin-btn admin-btn--primary login__submit" disabled={busy || !password}>
          {busy ? "Проверяем…" : "Войти"}
        </button>
      </form>
    </div>
  );
}

/* ───────────────────────── Editor ───────────────────────── */

interface Toast {
  id: number;
  text: string;
  kind: "info" | "error" | "success";
}

function Editor({ mode, onLogout }: { mode: Mode; onLogout: () => void }) {
  const [published, setPublished] = useState<Content | null>(null);
  const [content, setContent] = useState<Content | null>(null);
  const [pending, setPending] = useState<Pending>({});
  const [locale, setLocaleState] = useState<Locale>(() => {
    try {
      const l = localStorage.getItem(LOCALE_KEY);
      if (l && (LOCALES as readonly string[]).includes(l)) return l as Locale;
    } catch {}
    return "ru";
  });
  const [page, setPage] = useState<Page>("home");
  const [settings, setSettings] = useState<SettingsSpec | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [uploads, setUploads] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const blobUrls = useRef(new Map<string, string>());

  const notify = useCallback((text: string, kind: Toast["kind"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "error" ? 7000 : 4500);
  }, []);

  /* Load published content, then restore an unpublished draft if there is one. */
  useEffect(() => {
    fetch("/api/admin/content", { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (r.status === 401) return onLogout();
        if (!r.ok) throw new Error(data.error);
        const pub = data.content as Content;
        setPublished(pub);
        const draft = readDraft();
        if (draft && JSON.stringify(draft.content) !== JSON.stringify(pub)) {
          setContent(draft.content);
          setPending(draft.pending ?? {});
          notify("Восстановлен неопубликованный черновик");
        } else {
          setContent(pub);
        }
      })
      .catch((e: Error) => setLoadError(e.message || "Не удалось загрузить содержимое"));
  }, [notify, onLogout]);

  const dirty = useMemo(
    () => !!content && !!published && JSON.stringify(content) !== JSON.stringify(published),
    [content, published],
  );

  /* The design is a page-level attribute: preview the one being edited. */
  const design = content ? designOf(content) : null;
  useEffect(() => {
    if (design) document.documentElement.dataset.design = design;
  }, [design]);

  /* Keep the draft in the browser so a reload or closed tab loses nothing. */
  useEffect(() => {
    if (!content || !published) return;
    const id = setTimeout(() => writeDraft(dirty ? { content, pending, savedAt: Date.now() } : null), 250);
    return () => clearTimeout(id);
  }, [content, pending, published, dirty]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(LOCALE_KEY, l);
    } catch {}
  }, []);

  const update = useCallback((path: Path, value: unknown) => {
    setContent((c) => (c ? setAt(c, path, value) : c));
  }, []);

  const upload = useCallback(
    async (file: File, kind: UploadKind): Promise<string> => {
      let blob: Blob = file;
      let name = file.name;
      if (kind !== "files" && file.type !== "image/gif") {
        ({ blob, name } = await compressImage(file, kind));
      }
      if (blob.size > 4 * 1024 * 1024) {
        throw new Error("Файл больше 4 МБ. Загрузите его в Google Drive или Dropbox и вставьте ссылку.");
      }
      setUploads((n) => n + 1);
      try {
        const res = await fetch(
          `/api/admin/upload?name=${encodeURIComponent(name)}&kind=${encodeURIComponent(kind)}`,
          { method: "POST", body: blob },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Ошибка загрузки");
        blobUrls.current.set(data.path, URL.createObjectURL(blob));
        if (data.sha) {
          setPending((p) => ({ ...p, [data.path]: { repoPath: data.repoPath, sha: data.sha } }));
        }
        return data.path as string;
      } finally {
        setUploads((n) => n - 1);
      }
    },
    [],
  );

  const edit = useMemo<EditApi>(
    () => ({
      update,
      setText: (path, value) => update([...path, locale], value),
      listAdd: (path, item, index) =>
        setContent((c) => {
          if (!c) return c;
          const list = [...(getAt<unknown[]>(c, path) ?? [])];
          list.splice(index ?? list.length, 0, item);
          return setAt(c, path, list);
        }),
      listRemove: (path, index, confirmText) => {
        if (confirmText && !confirm(confirmText)) return;
        setContent((c) => {
          if (!c) return c;
          const list = [...(getAt<unknown[]>(c, path) ?? [])];
          list.splice(index, 1);
          return setAt(c, path, list);
        });
      },
      listMove: (path, index, dir) =>
        setContent((c) => {
          if (!c) return c;
          const list = [...(getAt<unknown[]>(c, path) ?? [])];
          const j = index + dir;
          if (j < 0 || j >= list.length) return c;
          [list[index], list[j]] = [list[j], list[index]];
          return setAt(c, path, list);
        }),
      upload,
      openSettings: setSettings,
      setLocale,
      goto: (p, hash) => {
        setPage(p);
        requestAnimationFrame(() => {
          if (hash) document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
          else window.scrollTo({ top: 0 });
        });
      },
      notify: (text, kind = "info") => notify(text, kind),
    }),
    [update, upload, setLocale, locale, notify],
  );

  const asset = useCallback(
    (p: string | null | undefined) => {
      if (!p) return "";
      const local = blobUrls.current.get(p);
      if (local) return local;
      const pend = pending[p];
      if (pend) return `/api/admin/file?sha=${pend.sha}&path=${encodeURIComponent(p)}`;
      return p;
    },
    [pending],
  );

  const publish = async () => {
    if (!content || publishing) return;
    if (uploads > 0) {
      notify("Дождитесь окончания загрузки файлов", "error");
      return;
    }
    (document.activeElement as HTMLElement | null)?.blur?.();
    setPublishing(true);
    try {
      const res = await fetch("/api/admin/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, pending: Object.values(pending) }),
      });
      const data = await res.json();
      if (res.status === 401) {
        notify("Сессия истекла — войдите снова. Черновик сохранён.", "error");
        onLogout();
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Ошибка публикации");
      setPublished(content);
      setPending({});
      writeDraft(null);
      notify(
        data.mode === "github"
          ? "Опубликовано. Сайт обновится примерно через минуту."
          : "Сохранено в файлы проекта.",
        "success",
      );
    } catch (e) {
      notify((e as Error).message, "error");
    } finally {
      setPublishing(false);
    }
  };

  const discard = () => {
    if (!published || !confirm("Отменить все неопубликованные изменения?")) return;
    setContent(published);
    setPending({});
    writeDraft(null);
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    onLogout();
  };

  /* Ctrl/Cmd+S publishes. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        document.getElementById("admin-publish")?.click();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (loadError) return <div className="admin-center login__error">{loadError}</div>;
  if (!content) return <div className="admin-center admin-loading">Загрузка содержимого…</div>;

  return (
    <SiteProvider content={content} locale={locale} page={page} edit={edit} asset={asset}>
      <div lang={locale}>{page === "home" ? <HomePage /> : <CertificatesPage />}</div>

      {mode === "unconfigured" && (
        <div className="admin-banner">
          Хранилище не настроено: добавьте GITHUB_TOKEN и GITHUB_REPO в переменные окружения Vercel. Пока
          изменения можно только сохранить как черновик в этом браузере.
        </div>
      )}

      <div className="admin-bar" role="toolbar" aria-label="Редактор">
        <div className="admin-bar__group">
          <div className="seg" role="group" aria-label="Язык редактирования">
            {LOCALES.map((l) => (
              <button
                key={l}
                type="button"
                className={l === locale ? "is-active" : ""}
                onClick={() => setLocale(l)}
                title={`Редактировать: ${LOCALE_NAMES[l]}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="seg" role="group" aria-label="Страница">
            <button type="button" className={page === "home" ? "is-active" : ""} onClick={() => edit.goto("home")}>
              Главная
            </button>
            <button
              type="button"
              className={page === "certificates" ? "is-active" : ""}
              onClick={() => edit.goto("certificates")}
              title="Архив сертификатов"
            >
              Архив
            </button>
          </div>
          <div className="seg seg--design" role="group" aria-label="Дизайн сайта">
            <span className="seg__label">Дизайн</span>
            {DESIGNS.map((d) => (
              <button
                key={d}
                type="button"
                className={design === d ? "is-active" : ""}
                onClick={() => update(["design"], d)}
                title={DESIGN_LABELS[d].hint}
              >
                {DESIGN_LABELS[d].label}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-bar__status" aria-live="polite">
          <span className={`dot${dirty ? " dot--dirty" : ""}`} />
          {uploads > 0 ? "Загрузка…" : dirty ? "Есть изменения" : "Опубликовано"}
        </div>

        <div className="admin-bar__group">
          <button type="button" className="admin-btn" onClick={discard} disabled={!dirty || publishing}>
            Отменить
          </button>
          <button
            id="admin-publish"
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={publish}
            disabled={!dirty || publishing || mode === "unconfigured"}
          >
            {publishing ? "Публикуем…" : "Опубликовать"}
          </button>
          <a className="admin-btn admin-btn--icon" href={pageHref(page, locale)} target="_blank" title="Открыть сайт">
            ↗
          </a>
          <button type="button" className="admin-btn admin-btn--icon" onClick={logout} title="Выйти">
            ⎋
          </button>
        </div>
      </div>

      {settings && <SettingsDialog spec={settings} onClose={() => setSettings(null)} />}

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.kind}`}>
            {t.text}
          </div>
        ))}
      </div>
    </SiteProvider>
  );
}
