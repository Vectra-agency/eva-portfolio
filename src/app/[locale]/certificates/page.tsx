import type { Metadata } from "next";
import content from "@content/content.json";
import { LOCALES, isLocale, t } from "@/lib/i18n";
import type { Content, Locale } from "@/lib/types";
import { SiteProvider } from "@/components/site/SiteContext";
import { CertificatesPage } from "@/components/site/Pages";

export async function generateMetadata({ params }: PageProps<"/[locale]/certificates">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const c = content as Content;
  return {
    title: `${t(c.ui.archiveTitle, locale)} — ${t(c.hero.name, locale)}`,
    description: t(c.ui.archiveIntro, locale),
    alternates: {
      canonical: `/${locale}/certificates`,
      languages: Object.fromEntries(LOCALES.map((l) => [l, `/${l}/certificates`])),
    },
  };
}

export default async function Page({ params }: PageProps<"/[locale]/certificates">) {
  const { locale } = await params;
  return (
    <SiteProvider content={content as Content} locale={locale as Locale} page="certificates">
      <CertificatesPage />
    </SiteProvider>
  );
}
