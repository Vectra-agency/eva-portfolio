import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import content from "@content/content.json";
import { LOCALES, isLocale, t } from "@/lib/i18n";
import { fontClasses, KOREAN_FONTS_HREF } from "@/lib/fonts";
import type { Content } from "@/lib/types";
import "@/styles/site.css";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: "#f5f1ea",
};

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const c = content as Content;
  return {
    title: t(c.meta.title, locale),
    description: t(c.meta.description, locale),
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html lang={locale} className={fontClasses} suppressHydrationWarning>
      <head>
        {/* Hide scroll-reveal blocks only when JS is available to show them again. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        {locale === "ko" && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
            <link rel="stylesheet" href={KOREAN_FONTS_HREF} />
          </>
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
