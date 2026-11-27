import { t } from "@/lib/i18n";
import type { Content, Locale, SectionId } from "@/lib/types";

/** Whether a section has anything to show to visitors (empty sections are hidden automatically). */
export function sectionHasContent(c: Content, id: SectionId, locale: Locale): boolean {
  switch (id) {
    case "experience":
      return c.experience.some((x) => t(x.org, locale) || t(x.role, locale));
    case "publications":
      return c.publications.items.some((p) => t(p.title, locale));
    case "education":
      return c.education.some((e) => t(e.title, locale)) || c.certificates.items.some((x) => x.featured && x.image);
    case "achievements":
      return c.achievements.some((a) => t(a.title, locale));
    case "recommendations":
      return c.recommendations.some((r) => t(r.title, locale));
    case "contacts":
      return c.contacts.some((x) => x.value.trim());
    case "downloads":
      return c.downloads.some(
        (d) => d.file || d.url.trim() || (d.kind === "certificates-zip" && c.certificates.items.some((x) => x.image)),
      );
  }
}

export function isSectionVisible(c: Content, id: SectionId, locale: Locale): boolean {
  return !c.sections[id]?.hidden && sectionHasContent(c, id, locale);
}
