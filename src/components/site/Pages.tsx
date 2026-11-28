"use client";

import { useEffect, useRef } from "react";
import { t } from "@/lib/i18n";
import { SECTION_IDS, type SectionId } from "@/lib/types";
import { AddButton, T } from "@/components/edit/Editable";
import { CertGrid, newCertificate, useZipDownload } from "./Certificates";
import { Header } from "./Header";
import { Hero } from "./Hero";
import { ArrowLeftIcon, ArrowUpIcon, DownloadIcon } from "./Icons";
import { Achievements, Contacts, Downloads, Education, Experience, Publications, Recommendations } from "./Sections";
import { useSite } from "./SiteContext";
import { isSectionVisible } from "./visibility";
import { uid } from "@/lib/content";
import { Marquee, StudioHero } from "./Studio";

/** Fades blocks in as they scroll into view (including ones added later, e.g. after filtering). */
function useReveal() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      el.querySelectorAll("[data-reveal]").forEach((n) => n.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    const watch = (scope: ParentNode) =>
      scope.querySelectorAll("[data-reveal]:not(.is-in)").forEach((n) => io.observe(n));
    watch(el);
    const mo = new MutationObserver((records) => {
      for (const r of records) r.addedNodes.forEach((n) => n instanceof Element && watch(n.parentNode ?? n));
    });
    mo.observe(el, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
  return root;
}

function Footer() {
  const { locale, content } = useSite();
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <T path={["footer", "text"]} as="p" className="site-footer__text" />
        <a href="#top" className="site-footer__top">
          {t(content.ui.toTop, locale)} <ArrowUpIcon />
        </a>
      </div>
    </footer>
  );
}

const SECTION_COMPONENTS: Record<SectionId, (p: { number: string }) => React.ReactNode> = {
  experience: Experience,
  publications: Publications,
  education: Education,
  achievements: Achievements,
  recommendations: Recommendations,
  contacts: Contacts,
  downloads: Downloads,
};

export function HomePage() {
  const { content, locale, design, edit } = useSite();
  const root = useReveal();

  // Numbers follow the wireframe (01 is the hero) and skip sections hidden from visitors.
  let n = 1;
  const numbered = SECTION_IDS.map((id) => {
    const visible = isSectionVisible(content, id, locale);
    return { id, number: visible ? String(++n).padStart(2, "0") : "—" };
  });

  return (
    <div ref={root} className={`site${edit ? " is-editing" : ""}`} id="top">
      <Header />
      <main className="page page--home" key={locale}>
        {design === "studio" ? (
          <>
            <StudioHero />
            <Marquee />
          </>
        ) : (
          <Hero />
        )}
        {numbered.map(({ id, number }) => {
          const C = SECTION_COMPONENTS[id];
          return <C key={id} number={number} />;
        })}
      </main>
      <Footer />
    </div>
  );
}

export function CertificatesPage() {
  const { content, locale, edit, href } = useSite();
  const root = useReveal();
  const zip = useZipDownload();
  const { themes, items } = content.certificates;
  const indexed = items.map((cert, index) => ({ cert, index })).filter((x) => edit || x.cert.image);
  const known = new Set(themes.map((th) => th.id));
  const orphans = indexed.filter((x) => !known.has(x.cert.theme));
  const groups = themes
    .map((theme, ti) => ({ theme, ti, list: indexed.filter((x) => x.cert.theme === theme.id) }))
    .filter((g) => edit || g.list.length > 0);

  const removeTheme = (ti: number) => {
    if (!edit) return;
    const theme = themes[ti];
    const used = items.some((c) => c.theme === theme.id);
    if (!confirm(`Удалить тему «${t(theme.label, "ru")}»?${used ? " Сертификаты из неё попадут в «Без темы»." : ""}`)) return;
    edit.listRemove(["certificates", "themes"], ti);
  };

  return (
    <div ref={root} className={`site${edit ? " is-editing" : ""}`} id="top">
      <Header />
      <main className="page page--archive" key={locale}>
        <div className="archive-head">
          {edit ? (
            <button type="button" className="back-link" onClick={() => edit.goto("home")}>
              <ArrowLeftIcon /> <T path={["ui", "backHome"]} />
            </button>
          ) : (
            <a href={href("home")} className="back-link">
              <ArrowLeftIcon /> {t(content.ui.backHome, locale)}
            </a>
          )}
          <T path={["ui", "archiveTitle"]} as="h1" className="archive-head__title" />
          <T path={["ui", "archiveIntro"]} as="p" className="archive-head__intro" multiline />
          <div className="archive-head__bar">
            <nav className="archive-themes" aria-label="Topics">
              {groups.map(({ theme, list }) => (
                <a key={theme.id} href={`#theme-${theme.id}`} className="chip">
                  {t(theme.label, locale) || "—"} <span className="chip__count">{list.length}</span>
                </a>
              ))}
            </nav>
            {indexed.some((x) => x.cert.image) && (
              <button type="button" className="btn-outline" onClick={zip.run} disabled={zip.busy}>
                <DownloadIcon />
                {zip.busy ? t(content.ui.preparing, locale) : t(content.ui.downloadAll, locale)}
              </button>
            )}
          </div>
        </div>

        {groups.map(({ theme, ti, list }) => (
          <section key={theme.id} id={`theme-${theme.id}`} className="archive-group">
            <header className="archive-group__head" data-reveal>
              <T
                path={["certificates", "themes", ti, "label"]}
                as="h2"
                className="archive-group__title"
                placeholder="Название темы"
              />
              <span className="archive-group__count">{String(list.length).padStart(2, "0")}</span>
              {edit && (
                <button type="button" className="ed-x" title="Удалить тему" onClick={() => removeTheme(ti)}>
                  ✕
                </button>
              )}
            </header>
            <CertGrid
              items={list}
              className="cert-grid--archive"
              addLabel="Сертификат в эту тему"
              onAdd={() => edit?.listAdd(["certificates", "items"], newCertificate(theme.id, false))}
            />
          </section>
        ))}

        {orphans.length > 0 && (
          <section className="archive-group">
            <header className="archive-group__head">
              <h2 className="archive-group__title">{edit ? "Без темы" : "—"}</h2>
            </header>
            <CertGrid items={orphans} className="cert-grid--archive" />
          </section>
        )}

        <AddButton
          label="Тема"
          onClick={() => edit?.listAdd(["certificates", "themes"], { id: uid("theme"), label: {} })}
        />
      </main>
      <Footer />
    </div>
  );
}
