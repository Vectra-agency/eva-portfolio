"use client";

import { useCallback, useEffect, useState } from "react";
import { formatMonth, t } from "@/lib/i18n";
import { uid } from "@/lib/content";
import type { Certificate, Locale } from "@/lib/types";
import { AddButton, EditableImage, ItemTools, T } from "@/components/edit/Editable";
import { AwardIcon, CloseIcon, ChevronIcon, PrevIcon } from "./Icons";
import { useSite } from "./SiteContext";
import { certificateSettings } from "./specs";

export function newCertificate(theme: string, featured: boolean): Certificate {
  const month = new Date().toISOString().slice(0, 7);
  return { id: uid("cert"), title: {}, issuer: {}, date: month, theme, image: null, featured };
}

/** Certificates with their position in content.certificates.items (needed for editing). */
export type IndexedCert = { cert: Certificate; index: number };

export function CertCard({
  item,
  onOpen,
  style,
}: {
  item: IndexedCert;
  onOpen: () => void;
  style?: React.CSSProperties;
}) {
  const { content, locale, edit } = useSite();
  const { cert, index } = item;
  const base = ["certificates", "items", index];
  const title = t(cert.title, locale);

  return (
    <figure className={`cert${edit ? " ed-item" : ""}`} data-reveal style={style}>
      {edit ? (
        <EditableImage
          path={[...base, "image"]}
          kind="certificates"
          alt={title}
          className="cert__thumb"
          removable={false}
          empty={
            <div className="cert__empty">
              <AwardIcon />
            </div>
          }
        />
      ) : (
        <button type="button" className="cert__thumb" onClick={onOpen} aria-label={title}>
          <CertImage cert={cert} />
        </button>
      )}
      <figcaption className="cert__caption">
        <T path={[...base, "title"]} className="cert__title" placeholder="Название сертификата" />
        <span className="cert__meta">
          <T path={[...base, "issuer"]} placeholder="Кем выдан" />
          {cert.date && <span className="cert__date">{formatMonth(cert.date, locale)}</span>}
        </span>
        {edit && !cert.featured && <span className="ed-badge">не на главной</span>}
      </figcaption>
      <ItemTools
        listPath={["certificates", "items"]}
        index={index}
        length={content.certificates.items.length}
        settings={certificateSettings(base)}
        what="сертификат"
      />
    </figure>
  );
}

function CertImage({ cert }: { cert: Certificate }) {
  const { asset, locale } = useSite();
  if (!cert.image)
    return (
      <span className="cert__empty">
        <AwardIcon />
      </span>
    );
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={asset(cert.image)} alt={t(cert.title, locale)} loading="lazy" decoding="async" />;
}

/** Grid of certificates plus a full-screen viewer. */
export function CertGrid({
  items,
  className = "",
  addLabel,
  onAdd,
}: {
  items: IndexedCert[];
  className?: string;
  addLabel?: string;
  onAdd?: () => void;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const viewable = items.filter((x) => x.cert.image);

  return (
    <>
      <div className={`cert-grid ${className}`}>
        {items.map((item, i) => (
          <CertCard
            key={item.cert.id}
            item={item}
            style={{ "--i": i % 6 } as React.CSSProperties}
            onOpen={() => setOpen(viewable.indexOf(item))}
          />
        ))}
        {onAdd && addLabel && <AddButton label={addLabel} onClick={onAdd} />}
      </div>
      {open !== null && open >= 0 && (
        <Lightbox items={viewable.map((x) => x.cert)} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />
      )}
    </>
  );
}

function Lightbox({
  items,
  index,
  onIndex,
  onClose,
}: {
  items: Certificate[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const { asset, locale, content } = useSite();
  const cert = items[index];
  const go = useCallback((d: number) => onIndex((index + d + items.length) % items.length), [index, items.length, onIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.classList.add("no-scroll");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("no-scroll");
    };
  }, [go, onClose]);

  if (!cert) return null;
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={t(cert.title, locale)} onClick={onClose}>
      <button type="button" className="lightbox__close" onClick={onClose} aria-label={t(content.ui.close, locale)}>
        <CloseIcon />
      </button>
      {items.length > 1 && (
        <>
          <button
            type="button"
            className="lightbox__nav lightbox__nav--prev"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            aria-label="Previous"
          >
            <PrevIcon />
          </button>
          <button
            type="button"
            className="lightbox__nav lightbox__nav--next"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            aria-label="Next"
          >
            <ChevronIcon />
          </button>
        </>
      )}
      <figure className="lightbox__figure" key={cert.id} onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset(cert.image)} alt={t(cert.title, locale)} />
        <figcaption>
          <strong>{t(cert.title, locale)}</strong>
          <span>
            {[t(cert.issuer, locale), cert.date && formatMonth(cert.date, locale)].filter(Boolean).join(" · ")}
          </span>
          <span className="lightbox__count">
            {index + 1} / {items.length}
          </span>
        </figcaption>
      </figure>
    </div>
  );
}

/* ───────────── ZIP of all certificates, built in the visitor's browser ───────────── */

function safeName(s: string) {
  return s.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "certificate";
}

export async function downloadCertificatesZip(
  certs: Certificate[],
  asset: (p: string | null) => string,
  locale: Locale,
  archiveName: string,
) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  let n = 0;
  for (const cert of certs) {
    if (!cert.image) continue;
    const res = await fetch(asset(cert.image));
    if (!res.ok) continue;
    const ext = cert.image.split(".").pop() ?? "jpg";
    n += 1;
    zip.file(`${String(n).padStart(2, "0")} ${safeName(t(cert.title, locale))}.${ext}`, await res.blob());
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName(archiveName)}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function useZipDownload() {
  const { content, locale, asset } = useSite();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const name = `${t(content.hero.name, "en") || "Portfolio"} — ${t(content.ui.archiveTitle, locale)}`;
      await downloadCertificatesZip(content.certificates.items, asset, locale, name);
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
}
