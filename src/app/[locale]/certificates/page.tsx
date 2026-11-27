import type { Metadata } from "next";
import { LOCALES, isLocale, t } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { getSiteContent } from "@/lib/server/site-content";
import { SiteProvider } from "@/components/site/SiteContext";
import { CertificatesPage } from "@/components/site/Pages";

export async function generateMetadata({ params }: PageProps<"/[locale]/certificates">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const c = await getSiteContent();
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
    <SiteProvider content={await getSiteContent()} locale={locale as Locale} page="certificates">
      <CertificatesPage />
    </SiteProvider>
  );
}
