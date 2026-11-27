"use client";

import { useState } from "react";
import { LOCALES, LOCALE_LABELS, formatMonth, t } from "@/lib/i18n";
import { contactHref, prettyValue, uid } from "@/lib/content";
import type { Publication } from "@/lib/types";
import { AddButton, EditableImage, ItemTools, Raw, T } from "@/components/edit/Editable";
import { CertGrid, newCertificate, useZipDownload } from "./Certificates";
import {
  ArrowUpRightIcon,
  CheckFileIcon,
  ChevronIcon,
  DownloadIcon,
  FileIcon,
  FolderIcon,
  GradIcon,
  TrophyIcon,
  CategoryIcon,
  ContactIcon,
} from "./Icons";
import { Section } from "./Section";
import { useSite } from "./SiteContext";
import { contactSettings, downloadSettings, publicationSettings, recommendationSettings } from "./specs";

const style = (i: number) => ({ "--i": i }) as React.CSSProperties;

/* ───────────────────────── 02 Experience ───────────────────────── */

export function Experience({ number }: { number: string }) {
  const { content, edit } = useSite();
  const list = content.experience;
  return (
    <Section id="experience" number={number}>
      <ol className="xp">
        {list.map((x, i) => (
          <li key={x.id} className={`xp__item${edit ? " ed-item" : ""}`} data-reveal style={style(i)}>
            <div className="xp__head">
              <T path={["experience", i, "org"]} as="h3" className="xp__org" placeholder="Организация" />
              <T path={["experience", i, "period"]} className="xp__period" placeholder="Период" />
            </div>
            <T path={["experience", i, "role"]} as="p" className="xp__role" placeholder="Должность" />
            <T
              path={["experience", i, "description"]}
              as="p"
              className="xp__desc"
              multiline
              placeholder="Описание (необязательно)"
            />
            <ItemTools listPath={["experience"]} index={i} length={list.length} what="место работы" />
          </li>
        ))}
      </ol>
      <AddButton
        label="Место работы"
        onClick={() =>
          edit?.listAdd(["experience"], { id: uid("exp"), org: {}, role: {}, period: {}, description: {} })
        }
      />
    </Section>
  );
}

/* ───────────────────────── 03 Publications ───────────────────────── */

function PublicationCard({ p, index, style: s }: { p: Publication; index: number; style?: React.CSSProperties }) {
  const { content, locale, edit } = useSite();
  const base = ["publications", "items", index];
  const catIndex = content.publications.categories.findIndex((c) => c.id === p.category);
  const cat = content.publications.categories[catIndex];
  const links = LOCALES.filter((l) => p.links?.[l]);
  const primary = p.links?.[locale] || (links[0] && p.links[links[0]]) || "";

  return (
    <article className={`pub${edit ? " ed-item" : ""}`} data-reveal style={s}>
      <EditableImage
        path={[...base, "cover"]}
        kind="covers"
        alt=""
        className="pub__cover"
        empty={
          <div className="pub__cover-empty">
            <CategoryIcon index={Math.max(catIndex, 0)} />
          </div>
        }
      />
      <div className="pub__body">
        <p className="pub__meta">
          {cat && <span>{t(cat.label, locale)}</span>}
          <T path={[...base, "outlet"]} placeholder="Издание" />
          {p.date && <span>{formatMonth(p.date, locale)}</span>}
        </p>
        <h3 className="pub__title">
          {edit || !primary ? (
            <T path={[...base, "title"]} placeholder="Заголовок публикации" />
          ) : (
            <a href={primary} target="_blank" rel="noopener noreferrer" className="pub__link">
              {t(p.title, locale)}
            </a>
          )}
        </h3>
        <T path={[...base, "description"]} as="p" className="pub__desc" multiline placeholder="Краткое описание" />
        {links.length > 0 && (
          <div className="pub__langs">
            {links.map((l) => (
              <a
                key={l}
                href={p.links[l]}
                target="_blank"
                rel="noopener noreferrer"
                hrefLang={l}
                className={`chip${l === locale ? " is-current" : ""}`}
                onClick={(e) => edit && e.preventDefault()}
              >
                {LOCALE_LABELS[l]} <ArrowUpRightIcon />
              </a>
            ))}
          </div>
        )}
        {edit && links.length === 0 && <span className="ed-hint">Добавьте ссылки в ⚙ настройках</span>}
      </div>
      <ItemTools
        listPath={["publications", "items"]}
        index={index}
        length={content.publications.items.length}
        settings={publicationSettings(base)}
        what="публикацию"
      />
    </article>
  );
}

export function Publications({ number }: { number: string }) {
  const { content, locale, edit } = useSite();
  const { categories, items } = content.publications;
  const [active, setActive] = useState<string>("all");
  const indexed = items.map((p, index) => ({ p, index })).filter((x) => edit || t(x.p.title, locale));
  const shown = active === "all" ? indexed : indexed.filter((x) => x.p.category === active);
  const count = (id: string) => indexed.filter((x) => x.p.category === id).length;

  const removeCategory = (i: number) => {
    if (!edit) return;
    const cat = categories[i];
    const used = items.some((p) => p.category === cat.id);
    const rest = categories.filter((_, j) => j !== i);
    if (used && rest.length === 0) {
      edit.notify("Нельзя удалить последнюю рубрику, пока в ней есть публикации", "error");
      return;
    }
    const msg = used
      ? `Удалить рубрику «${t(cat.label, "ru")}»? Её публикации перейдут в «${t(rest[0].label, "ru")}».`
      : `Удалить рубрику «${t(cat.label, "ru")}»?`;
    if (!confirm(msg)) return;
    if (used) {
      edit.update(
        ["publications", "items"],
        items.map((p) => (p.category === cat.id ? { ...p, category: rest[0].id } : p)),
      );
    }
    edit.listRemove(["publications", "categories"], i);
    if (active === cat.id) setActive("all");
  };

  return (
    <Section id="publications" number={number}>
      <div className="filters" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={active === "all"}
          className={`filter${active === "all" ? " is-active" : ""}`}
          onClick={() => setActive("all")}
        >
          <T path={["ui", "all"]} className="filter__label" />
          <span className="filter__count">{indexed.length}</span>
        </button>
        {categories.map((c, i) => {
          const n = count(c.id);
          if (!edit && n === 0) return null;
          return (
            <div key={c.id} className={`filter-wrap${edit ? " ed-item" : ""}`}>
              <button
                type="button"
                role="tab"
                aria-selected={active === c.id}
                className={`filter${active === c.id ? " is-active" : ""}`}
                onClick={() => setActive(c.id)}
              >
                <CategoryIcon index={i} />
                <T path={["publications", "categories", i, "label"]} className="filter__label" placeholder="Рубрика" />
                <span className="filter__count">{n}</span>
              </button>
              {edit && (
                <button type="button" className="ed-x" title="Удалить рубрику" onClick={() => removeCategory(i)}>
                  ✕
                </button>
              )}
            </div>
          );
        })}
        <AddButton
          label="Рубрика"
          onClick={() => edit?.listAdd(["publications", "categories"], { id: uid("cat"), label: {} })}
        />
      </div>

      <div className="pubs" key={active}>
        {shown.map(({ p, index }, i) => (
          <PublicationCard key={p.id} p={p} index={index} style={style(i % 3)} />
        ))}
        {shown.length === 0 && <T path={["ui", "empty"]} as="p" className="muted pubs__empty" />}
      </div>
      <AddButton
        label="Публикация"
        onClick={() =>
          edit?.listAdd(
            ["publications", "items"],
            {
              id: uid("pub"),
              category: active !== "all" ? active : (categories[0]?.id ?? ""),
              title: {},
              outlet: {},
              date: new Date().toISOString().slice(0, 7),
              description: {},
              cover: null,
              links: {},
            },
            0,
          )
        }
      />
    </Section>
  );
}

/* ───────────────────────── 04 Education + certificates ───────────────────────── */

export function Education({ number }: { number: string }) {
  const { content, locale, edit, href } = useSite();
  const list = content.education;
  const featured = content.certificates.items
    .map((cert, index) => ({ cert, index }))
    .filter((x) => x.cert.featured && (edit || x.cert.image));

  return (
    <Section id="education" number={number}>
      <ul className="rows">
        {list.map((e, i) => (
          <li key={e.id} className={`row${edit ? " ed-item" : ""}`} data-reveal style={style(i)}>
            <span className="row__icon">
              <GradIcon />
            </span>
            <div className="row__main">
              <T path={["education", i, "title"]} as="h3" className="row__title" placeholder="Направление" />
              <T path={["education", i, "place"]} as="p" className="row__sub" placeholder="Где учились" />
            </div>
            <Raw path={["education", i, "period"]} className="row__aside" placeholder="Годы" />
            <ItemTools listPath={["education"]} index={i} length={list.length} what="запись об образовании" />
          </li>
        ))}
      </ul>
      <AddButton
        label="Образование"
        onClick={() => edit?.listAdd(["education"], { id: uid("edu"), title: {}, place: {}, period: "" })}
      />

      {(featured.length > 0 || edit) && (
        <div className="certs-card" data-reveal>
          <div className="certs-card__head">
            <T path={["certificates", "title"]} as="h3" className="certs-card__title" />
          </div>
          <CertGrid
            items={featured}
            addLabel="Сертификат"
            onAdd={() =>
              edit?.listAdd(
                ["certificates", "items"],
                newCertificate(content.certificates.themes[0]?.id ?? "", true),
                0,
              )
            }
          />
          {edit ? (
            <button type="button" className="archive-link" onClick={() => edit.goto("certificates")}>
              <FolderIcon />
              <T path={["certificates", "archiveLink"]} className="archive-link__label" />
              <ChevronIcon />
            </button>
          ) : (
            <a href={href("certificates")} className="archive-link">
              <FolderIcon />
              <span className="archive-link__label">{t(content.certificates.archiveLink, locale)}</span>
              <ChevronIcon />
            </a>
          )}
        </div>
      )}
    </Section>
  );
}

/* ───────────────────────── 05 Achievements ───────────────────────── */

export function Achievements({ number }: { number: string }) {
  const { content, edit } = useSite();
  const list = content.achievements;
  return (
    <Section id="achievements" number={number}>
      <ul className="rows rows--large">
        {list.map((a, i) => (
          <li key={a.id} className={`row${edit ? " ed-item" : ""}`} data-reveal style={style(i)}>
            <span className="row__icon">
              <TrophyIcon />
            </span>
            <div className="row__main">
              <T path={["achievements", i, "title"]} as="h3" className="row__title" placeholder="Достижение" />
              <T
                path={["achievements", i, "description"]}
                as="p"
                className="row__sub"
                multiline
                placeholder="Подробности (необязательно)"
              />
            </div>
            <Raw path={["achievements", i, "year"]} className="row__aside" placeholder="Год" />
            <ItemTools listPath={["achievements"]} index={i} length={list.length} what="достижение" />
          </li>
        ))}
      </ul>
      <AddButton
        label="Достижение"
        onClick={() => edit?.listAdd(["achievements"], { id: uid("ach"), title: {}, description: {}, year: "" })}
      />
    </Section>
  );
}

/* ───────────────────────── 06 Recommendations ───────────────────────── */

export function Recommendations({ number }: { number: string }) {
  const { content, locale, edit, asset } = useSite();
  const list = content.recommendations;
  return (
    <Section id="recommendations" number={number}>
      <ul className="rows">
        {list.map((r, i) => {
          const link = r.file ? asset(r.file) : r.url.trim();
          return (
            <li key={r.id} className={`row${edit ? " ed-item" : ""}`} data-reveal style={style(i)}>
              <span className="row__icon">
                <CheckFileIcon />
              </span>
              <div className="row__main">
                <T path={["recommendations", i, "title"]} as="h3" className="row__title" placeholder="Документ" />
                <T
                  path={["recommendations", i, "description"]}
                  as="p"
                  className="row__sub"
                  multiline
                  placeholder="Описание"
                />
              </div>
              {link && !edit && (
                <a href={link} target="_blank" rel="noopener noreferrer" className="row__action">
                  {t(content.ui.read, locale)} <ArrowUpRightIcon />
                </a>
              )}
              <ItemTools
                listPath={["recommendations"]}
                index={i}
                length={list.length}
                settings={recommendationSettings(["recommendations", i])}
                what="документ"
              />
            </li>
          );
        })}
      </ul>
      <AddButton
        label="Документ"
        onClick={() =>
          edit?.listAdd(["recommendations"], { id: uid("rec"), title: {}, description: {}, file: null, url: "" })
        }
      />
    </Section>
  );
}

/* ───────────────────────── 07 Contacts ───────────────────────── */

export function Contacts({ number }: { number: string }) {
  const { content, edit } = useSite();
  const list = content.contacts;
  return (
    <Section id="contacts" number={number}>
      <ul className="contacts">
        {list.map((c, i) => {
          if (!edit && !c.value.trim()) return null;
          const href = contactHref(c.type, c.value);
          const external = !href.startsWith("mailto:") && !href.startsWith("tel:");
          const inner = (
            <>
              <span className="contact__icon">
                <ContactIcon type={c.type} />
              </span>
              <span className="contact__text">
                <T path={["contacts", i, "label"]} className="contact__label" placeholder="Подпись" />
                <span className="contact__value">{prettyValue(c.type, c.value) || "—"}</span>
              </span>
              <ArrowUpRightIcon className="icon contact__arrow" />
            </>
          );
          return (
            <li key={c.id} className={edit ? "ed-item" : ""} data-reveal style={style(i)}>
              {edit ? (
                <div className="contact">{inner}</div>
              ) : (
                <a
                  className="contact"
                  href={href}
                  {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  {inner}
                </a>
              )}
              <ItemTools
                listPath={["contacts"]}
                index={i}
                length={list.length}
                settings={contactSettings(["contacts", i])}
                what="контакт"
              />
            </li>
          );
        })}
      </ul>
      <AddButton
        label="Контакт"
        onClick={() => edit?.listAdd(["contacts"], { id: uid("contact"), type: "website", label: {}, value: "" })}
      />
    </Section>
  );
}

/* ───────────────────────── 08 Downloads ───────────────────────── */

export function Downloads({ number }: { number: string }) {
  const { content, locale, edit, asset } = useSite();
  const list = content.downloads;
  const zip = useZipDownload();
  const hasCerts = content.certificates.items.some((x) => x.image);

  return (
    <Section id="downloads" number={number}>
      <ul className="downloads">
        {list.map((d, i) => {
          const isZip = d.kind === "certificates-zip";
          const link = d.file ? asset(d.file) : d.url.trim();
          if (!edit && (isZip ? !hasCerts : !link)) return null;
          const ext = (d.file ?? d.url).split("?")[0].split(".").pop();
          const inner = (
            <>
              <span className="dl__icon">
                <FileIcon />
              </span>
              <span className="dl__main">
                <T path={["downloads", i, "title"]} className="dl__title" placeholder="Название файла" />
                <span className="dl__format">
                  {isZip && zip.busy ? t(content.ui.preparing, locale) : d.format}
                </span>
              </span>
              <span className="dl__action">
                <DownloadIcon />
              </span>
            </>
          );
          let node;
          if (edit) {
            node = (
              <div className="dl">
                {inner}
                {!isZip && !link && <span className="ed-badge">нет файла — скрыто на сайте</span>}
              </div>
            );
          } else if (isZip) {
            node = (
              <button type="button" className="dl" onClick={zip.run} aria-busy={zip.busy}>
                {inner}
              </button>
            );
          } else if (d.file) {
            node = (
              <a className="dl" href={link} download={`${t(d.title, locale) || "file"}.${ext}`}>
                {inner}
              </a>
            );
          } else {
            node = (
              <a className="dl" href={link} target="_blank" rel="noopener noreferrer">
                {inner}
              </a>
            );
          }
          return (
            <li key={d.id} className={edit ? "ed-item" : ""} data-reveal style={style(i)}>
              {node}
              <ItemTools
                listPath={["downloads"]}
                index={i}
                length={list.length}
                settings={downloadSettings(["downloads", i])}
                what="файл"
              />
            </li>
          );
        })}
      </ul>
      <AddButton
        label="Файл"
        onClick={() =>
          edit?.listAdd(["downloads"], { id: uid("dl"), title: {}, format: "PDF", kind: "file", file: null, url: "" })
        }
      />
    </Section>
  );
}
