export const LOCALES = ["ru", "en", "ko"] as const;
export type Locale = (typeof LOCALES)[number];

/** Localized string: one value per language, any of them may be missing. */
export type L = Partial<Record<Locale, string>>;

export const SECTION_IDS = [
  "experience",
  "publications",
  "education",
  "achievements",
  "recommendations",
  "contacts",
  "downloads",
] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export interface SectionMeta {
  title: L;
  nav: L;
  hidden?: boolean;
}

export interface Category {
  id: string;
  label: L;
}

export interface ExperienceItem {
  id: string;
  org: L;
  role: L;
  period: L;
  description: L;
}

export interface Publication {
  id: string;
  category: string;
  title: L;
  outlet: L;
  /** YYYY-MM or YYYY-MM-DD */
  date: string;
  description: L;
  cover: string | null;
  /** Link to the original publication in each language. */
  links: Partial<Record<Locale, string>>;
}

export interface EducationItem {
  id: string;
  title: L;
  place: L;
  period: string;
}

export interface Certificate {
  id: string;
  title: L;
  issuer: L;
  date: string;
  theme: string;
  image: string | null;
  featured: boolean;
}

export interface Achievement {
  id: string;
  title: L;
  description: L;
  year: string;
}

export interface Recommendation {
  id: string;
  title: L;
  description: L;
  file: string | null;
  url: string;
}

export const CONTACT_TYPES = [
  "email",
  "linkedin",
  "remember",
  "telegram",
  "instagram",
  "website",
  "phone",
  "other",
] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

export interface Contact {
  id: string;
  type: ContactType;
  label: L;
  value: string;
}

export interface DownloadItem {
  id: string;
  title: L;
  format: string;
  kind: "file" | "certificates-zip";
  file: string | null;
  url: string;
}

export const UI_KEYS = [
  "all",
  "read",
  "download",
  "backHome",
  "archiveTitle",
  "archiveIntro",
  "downloadAll",
  "preparing",
  "empty",
  "menu",
  "close",
  "toTop",
] as const;
export type UiKey = (typeof UI_KEYS)[number];

export interface Content {
  meta: { title: L; description: L };
  hero: { eyebrow: L; name: L; title: L; tags: L; photo: string | null };
  sections: Record<SectionId, SectionMeta>;
  experience: ExperienceItem[];
  publications: { categories: Category[]; items: Publication[] };
  education: EducationItem[];
  certificates: { title: L; archiveLink: L; themes: Category[]; items: Certificate[] };
  achievements: Achievement[];
  recommendations: Recommendation[];
  contacts: Contact[];
  downloads: DownloadItem[];
  footer: { text: L };
  ui: Record<UiKey, L>;
}

export type Path = (string | number)[];
