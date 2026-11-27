"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { t } from "@/lib/i18n";
import { EditableImage, T } from "@/components/edit/Editable";
import { LivingPortrait } from "./LivingPortrait";
import { useSite } from "./SiteContext";

const delay = (d: string, y = "20px") => ({ "--d": d, "--y": y }) as React.CSSProperties;

/** Scales a single line of text so it spans the full width of its container. */
function FitLine({ children, className, max = 0.6 }: { children: ReactNode; className?: string; max?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLSpanElement>(null);

  const fit = useCallback(() => {
    const b = box.current, l = line.current;
    if (!b || !l) return;
    l.style.fontSize = "100px";
    const w = l.scrollWidth;
    if (!w) return;
    // never taller than a share of the viewport, so short greetings don't explode
    const size = Math.min((100 * b.clientWidth) / w, window.innerHeight * max);
    l.style.fontSize = `${size * 0.98}px`;
  }, [max]);

  // Re-fit after every render: the text may have just been edited.
  useLayoutEffect(() => fit());
  useEffect(() => {
    const ro = new ResizeObserver(fit);
    if (box.current) ro.observe(box.current);
    document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, [fit]);

  return (
    <div ref={box} className={className}>
      <span ref={line} className="fit-line">
        {children}
      </span>
    </div>
  );
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function StudioHero() {
  const { content, locale, edit, asset } = useSite();
  const name = t(content.hero.name, locale);
  const greeting = t(content.hero.greeting, locale) || name;
  const photo = content.hero.photo;

  return (
    <section className="studio-hero" id="home">
      <FitLine className="studio-hero__heading studio-in" max={0.36}>
        {edit ? (
          <T path={["hero", "greeting"]} as="span" className="hero-heading" placeholder={name} />
        ) : (
          <h1 className="hero-heading" aria-label={`${greeting} — ${name}`}>
            {greeting}
          </h1>
        )}
      </FitLine>

      {edit ? (
        <div className="portrait-wrap portrait-wrap--edit">
          <EditableImage
            path={["hero", "photo"]}
            kind="photo"
            alt={name}
            className="portrait-inner"
            empty={<div className="portrait-blank portrait-blank--edit">{initialsOf(name)}</div>}
          />
          <span className="ed-hint portrait-hint">
            Лучше всего — PNG с прозрачным фоном: тогда «тянется» только сам портрет.
          </span>
        </div>
      ) : (
        <LivingPortrait src={photo ? asset(photo) : null} initials={initialsOf(name)} alt={name} />
      )}

      <div className="studio-hero__bottom">
        <T
          path={["hero", "title"]}
          as="p"
          className="studio-hero__tagline studio-in"
          placeholder="Короткое описание"
        />
        <div className="studio-in" style={delay("0.5s")}>
          {edit ? (
            <span className="contact-btn">
              <T path={["ui", "contactMe"]} />
            </span>
          ) : (
            <a href="#contacts" className="contact-btn">
              {t(content.ui.contactMe, locale)}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

/** Two rows of her own images (publication covers, certificates) drifting with the page scroll. */
export function Marquee() {
  const { content, asset } = useSite();
  const ref = useRef<HTMLDivElement>(null);
  const row1 = useRef<HTMLDivElement>(null);
  const row2 = useRef<HTMLDivElement>(null);

  const images = [
    ...content.publications.items.map((p) => p.cover),
    ...content.certificates.items.map((c) => c.image),
  ].filter((x): x is string => !!x);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const offset = (window.scrollY - top + window.innerHeight) * 0.3;
      if (row1.current) row1.current.style.transform = `translate3d(${offset - 200}px,0,0)`;
      if (row2.current) row2.current.style.transform = `translate3d(${-(offset - 200)}px,0,0)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (images.length < 4) return null;
  const half = Math.ceil(images.length / 2);
  const rows = [images.slice(0, half), images.slice(half)];

  return (
    <div className="marquee" ref={ref} aria-hidden="true">
      {rows.map((row, r) => (
        <div key={r} className="marquee__row" ref={r === 0 ? row1 : row2}>
          {[...row, ...row, ...row].map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={asset(src)} alt="" loading="lazy" decoding="async" className="marquee__item" />
          ))}
        </div>
      ))}
    </div>
  );
}
