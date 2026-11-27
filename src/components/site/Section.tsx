"use client";

import type { ReactNode } from "react";
import type { SectionId } from "@/lib/types";
import { T } from "@/components/edit/Editable";
import { useSite } from "./SiteContext";
import { isSectionVisible } from "./visibility";

export function Section({
  id,
  number,
  children,
  aside,
}: {
  id: SectionId;
  number: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  const { content, locale, edit } = useSite();
  const meta = content.sections[id];
  const hidden = !!meta?.hidden;
  if (!edit && !isSectionVisible(content, id, locale)) return null;

  return (
    <section id={id} className={`section section--${id}${hidden ? " is-hidden-section" : ""}`}>
      <header className="section__head" data-reveal>
        <span className="section__num">{number}</span>
        <T path={["sections", id, "title"]} as="h2" className="section__title" />
        {aside}
        {edit && (
          <div className="ed-section-bar">
            <button
              type="button"
              className="ed-btn ed-btn--ghost"
              onClick={() => edit.update(["sections", id, "hidden"], !hidden)}
            >
              {hidden ? "◌ Раздел скрыт — показать" : "◉ Скрыть раздел"}
            </button>
            <span className="ed-section-bar__nav">
              В меню: <T path={["sections", id, "nav"]} placeholder="не показывать" />
            </span>
          </div>
        )}
      </header>
      <div className="section__body">{children}</div>
    </section>
  );
}
