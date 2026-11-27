"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LANG_COOKIE, LOCALES, LOCALE_LABELS, LOCALE_NAMES, t } from "@/lib/i18n";
import { SECTION_IDS, type Locale } from "@/lib/types";
import { CloseIcon, MenuIcon } from "./Icons";
import { useSite } from "./SiteContext";
import { isSectionVisible } from "./visibility";

function rememberLocale(l: Locale) {
  document.cookie = `${LANG_COOKIE}=${l}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function LangSwitch({ className = "" }: { className?: string }) {
  const { locale, page, href, edit } = useSite();
  return (
    <div className={`lang ${className}`} role="group" aria-label="Language">
      {LOCALES.map((l) =>
        edit ? (
          <button
            key={l}
            type="button"
            className={`lang__item${l === locale ? " is-active" : ""}`}
            onClick={() => edit.setLocale(l)}
            title={LOCALE_NAMES[l]}
          >
            {LOCALE_LABELS[l]}
          </button>
        ) : (
          <Link
            key={l}
            href={href(page, l)}
            hrefLang={l}
            lang={l}
            className={`lang__item${l === locale ? " is-active" : ""}`}
            aria-current={l === locale ? "true" : undefined}
            title={LOCALE_NAMES[l]}
            onClick={() => rememberLocale(l)}
            scroll={false}
          >
            {LOCALE_LABELS[l]}
          </Link>
        ),
      )}
    </div>
  );
}

export function Header() {
  const { content, locale, page, href, edit } = useSite();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("menu-open", open);
    return () => document.body.classList.remove("menu-open");
  }, [open]);

  const nav = SECTION_IDS.filter(
    (id) => (edit || isSectionVisible(content, id, locale)) && t(content.sections[id].nav, locale),
  );
  const homeHref = href("home");
  const sectionHref = (id: string) => (page === "home" ? `#${id}` : `${homeHref}#${id}`);

  const go = (e: React.MouseEvent, id: string) => {
    setOpen(false);
    if (edit && page !== "home") {
      e.preventDefault();
      edit.goto("home", id);
    }
  };

  return (
    <header className={`site-header${scrolled ? " is-scrolled" : ""}${open ? " is-open" : ""}`}>
      <div className="site-header__inner">
        {edit ? (
          <button type="button" className="brand" onClick={() => edit.goto("home")}>
            {t(content.hero.name, locale)}
          </button>
        ) : (
          <Link href={page === "home" ? "#top" : homeHref} className="brand" onClick={() => setOpen(false)}>
            {t(content.hero.name, locale)}
          </Link>
        )}

        <nav className="site-nav" aria-label="Sections">
          {nav.map((id) => (
            <a key={id} href={sectionHref(id)} className="site-nav__link" onClick={(e) => go(e, id)}>
              {t(content.sections[id].nav, locale)}
            </a>
          ))}
        </nav>

        <div className="site-header__end">
          <LangSwitch />
          <button
            type="button"
            className="menu-btn"
            aria-expanded={open}
            aria-label={t(open ? content.ui.close : content.ui.menu, locale)}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      <div className="mobile-menu" aria-hidden={!open}>
        <nav>
          {nav.map((id, i) => (
            <a
              key={id}
              href={sectionHref(id)}
              className="mobile-menu__link"
              style={{ "--i": i } as React.CSSProperties}
              onClick={(e) => go(e, id)}
              tabIndex={open ? 0 : -1}
            >
              {t(content.sections[id].nav, locale)}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
