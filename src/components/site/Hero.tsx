"use client";

import { t } from "@/lib/i18n";
import { EditableImage, T } from "@/components/edit/Editable";
import { useSite } from "./SiteContext";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function Hero() {
  const { content, locale, edit } = useSite();
  const name = t(content.hero.name, locale);
  const tags = t(content.hero.tags, locale)
    .split("·")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <section className="hero" id="home">
      <div className="hero__text">
        <p className="hero__eyebrow">
          <span className="hero__eyebrow-num">01</span>
          <T path={["hero", "eyebrow"]} />
        </p>

        {edit ? (
          <T path={["hero", "name"]} as="h1" className="hero__name" />
        ) : (
          <h1 className="hero__name" aria-label={name}>
            {name.split(/\s+/).map((word, i) => (
              <span key={i} className="hero__line" aria-hidden="true">
                <span style={{ "--i": i } as React.CSSProperties}>{word}</span>
              </span>
            ))}
          </h1>
        )}

        <T path={["hero", "title"]} as="p" className="hero__title" />

        {edit ? (
          <div className="hero__tags">
            <T path={["hero", "tags"]} placeholder="Теги через « · »" />
            <span className="ed-hint">Разделяйте темы точкой «·»</span>
          </div>
        ) : (
          <ul className="hero__tags">
            {tags.map((tag, i) => (
              <li key={i} style={{ "--i": i } as React.CSSProperties}>
                {tag}
              </li>
            ))}
          </ul>
        )}
      </div>

      <figure className="hero__figure">
        <EditableImage
          path={["hero", "photo"]}
          kind="photo"
          alt={name}
          className="hero__photo"
          empty={
            <div className="hero__monogram" aria-hidden="true">
              <span>{initials(name)}</span>
            </div>
          }
        />
      </figure>

      <a href="#experience" className="hero__scroll" aria-hidden="true" tabIndex={-1}>
        <span />
      </a>
    </section>
  );
}
