import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { LOCALES, isLocale, t } from "@/lib/i18n";
import { DEFAULT_DESIGN_SEGMENT } from "@/lib/content";
import { DESIGNS } from "@/lib/types";
import { fontClasses, KOREAN_FONTS_HREF, STUDIO_FONTS_HREF, THEME_COLOR } from "@/lib/fonts";
import { getSiteContent, pageDesign } from "@/lib/server/site-content";
import "@/styles/site.css";
import "@/styles/minimal.css";
import "@/styles/studio.css";

/** /ru/_ is the design chosen in the editor (served at /ru), /ru/studio etc. pin a design. */
export function generateStaticParams() {
  return LOCALES.flatMap((locale) => [DEFAULT_DESIGN_SEGMENT, ...DESIGNS].map((design) => ({ locale, design })));
}

export async function generateViewport({ params }: LayoutProps<"/[locale]/[design]">): Promise<Viewport> {
  const resolved = await pageDesign((await params).design);
  return resolved ? { themeColor: THEME_COLOR[resolved.design] } : {};
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]/[design]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const c = await getSiteContent();
  return {
    title: t(c.meta.title, locale),
    description: t(c.meta.description, locale),
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]/[design]">) {
  const { locale, design: segment } = await params;
  const resolved = await pageDesign(segment);
  if (!isLocale(locale) || !resolved) notFound();
  const { design } = resolved;
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
