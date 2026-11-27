import type { Metadata } from "next";
import content from "@content/content.json";
import { LOCALES, isLocale, t } from "@/lib/i18n";
import type { Content, Locale } from "@/lib/types";
import { SiteProvider } from "@/components/site/SiteContext";
import { HomePage } from "@/components/site/Pages";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const c = content as Content;
  return {
    title: t(c.meta.title, locale),
    description: t(c.meta.description, locale),
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(LOCALES.map((l) => [l, `/${l}`])),
    },
    openGraph: {
      title: t(c.meta.title, locale),
      description: t(c.meta.description, locale),
      type: "profile",
      locale,
    },
  };
}

export default async function Page({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  return (
    <SiteProvider content={content as Content} locale={locale as Locale} page="home">
      <HomePage />
    </SiteProvider>
  );
}
