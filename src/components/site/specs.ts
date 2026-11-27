import { t } from "@/lib/i18n";
import { CONTACT_TYPES, type Content, type Path } from "@/lib/types";
import type { FieldSpec, SettingsSpec } from "./SiteContext";

const CONTACT_LABELS: Record<string, string> = {
  email: "Почта",
  linkedin: "LinkedIn",
  remember: "Remember",
  telegram: "Telegram",
  instagram: "Instagram",
  website: "Сайт",
  phone: "Телефон",
  other: "Другая ссылка",
};

/* Settings dialogs for things that are not plain text (dates, links, files…). */

export const publicationSettings = (path: Path): SettingsSpec => ({
  title: "Публикация",
  path,
  fields: (c: Content): FieldSpec[] => [
    {
      type: "select",
      key: "category",
      label: "Рубрика",
      options: c.publications.categories.map((x) => ({ value: x.id, label: t(x.label, "ru") || x.id })),
    },
    { type: "month", key: "date", label: "Дата публикации" },
    { type: "image", key: "cover", label: "Обложка", kind: "covers" },
    { type: "links", key: "links", label: "Ссылки на оригинал (по языкам)" },
  ],
});

export const certificateSettings = (path: Path): SettingsSpec => ({
  title: "Сертификат",
  path,
  fields: (c: Content): FieldSpec[] => [
    { type: "image", key: "image", label: "Изображение (JPG / PNG)", kind: "certificates" },
    {
      type: "select",
      key: "theme",
      label: "Тема в архиве",
      options: c.certificates.themes.map((x) => ({ value: x.id, label: t(x.label, "ru") || x.id })),
    },
    { type: "month", key: "date", label: "Дата" },
    { type: "checkbox", key: "featured", label: "Показывать на главной (избранный)" },
  ],
});

export const contactSettings = (path: Path): SettingsSpec => ({
  title: "Контакт",
  path,
  fields: (): FieldSpec[] => [
    {
      type: "select",
      key: "type",
      label: "Тип",
      options: CONTACT_TYPES.map((x) => ({ value: x, label: CONTACT_LABELS[x] })),
    },
    {
      type: "text",
      key: "value",
      label: "Адрес или ссылка",
      placeholder: "name@example.com или https://…",
    },
  ],
});

export const downloadSettings = (path: Path): SettingsSpec => ({
  title: "Файл для скачивания",
  path,
  fields: (): FieldSpec[] => [
    {
      type: "select",
      key: "kind",
      label: "Что скачивается",
      options: [
        { value: "file", label: "Загруженный файл или ссылка" },
        { value: "certificates-zip", label: "Все сертификаты одним ZIP (собирается автоматически)" },
      ],
    },
    { type: "text", key: "format", label: "Подпись формата", placeholder: "PDF" },
    {
      type: "file",
      key: "file",
      label: "Файл (до 4 МБ)",
      hint: "Если файл больше — загрузите его в Google Drive / Dropbox и вставьте ссылку ниже.",
    },
    { type: "text", key: "url", label: "…или внешняя ссылка", placeholder: "https://…" },
  ],
});

export const recommendationSettings = (path: Path): SettingsSpec => ({
  title: "Документ",
  path,
  fields: (): FieldSpec[] => [
    { type: "file", key: "file", label: "Файл (до 4 МБ)" },
    { type: "text", key: "url", label: "…или внешняя ссылка", placeholder: "https://…" },
  ],
});
