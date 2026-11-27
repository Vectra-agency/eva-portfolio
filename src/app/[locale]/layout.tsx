import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import content from "@content/content.json";
import { LOCALES, isLocale, t } from "@/lib/i18n";
import { designOf } from "@/lib/content";
import { fontClasses, KOREAN_FONTS_HREF, STUDIO_FONTS_HREF, THEME_COLOR } from "@/lib/fonts";
import type { Content } from "@/lib/types";
import "@/styles/site.css";
import "@/styles/minimal.css";
import "@/styles/studio.css";

const c = content as Content;
const design = designOf(c);

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: THEME_COLOR[design],
};

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    title: t(c.meta.title, locale),
    description: t(c.meta.description, locale),
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const needsFonts = locale === "ko" || design === "studio";
  return (
    <html lang={locale} className={fontClasses} data-design={design} suppressHydrationWarning>
      <head>
        {/* Hide scroll-reveal blocks only when JS is available to show them again. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        {needsFonts && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          </>
        )}
        {locale === "ko" && <link rel="stylesheet" href={KOREAN_FONTS_HREF} />}
        {design === "studio" && <link rel="stylesheet" href={STUDIO_FONTS_HREF} />}
      </head>
      <body>{children}</body>
    </html>
  );
}
