import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LOCALES, isLocale, t } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { getSiteContent, pageDesign } from "@/lib/server/site-content";
import { SiteProvider } from "@/components/site/SiteContext";
import { CertificatesPage } from "@/components/site/Pages";

export async function generateMetadata({ params }: PageProps<"/[locale]/[design]/certificates">): Promise<Metadata> {
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

export default async function Page({ params }: PageProps<"/[locale]/[design]/certificates">) {
  const { locale, design } = await params;
  const resolved = await pageDesign(design);
  if (!resolved) notFound();
  return (
    <SiteProvider
      content={await getSiteContent()}
      locale={locale as Locale}
      page="certificates"
      design={resolved.design}
      urlDesign={resolved.named}
    >
      <CertificatesPage />
    </SiteProvider>
  );
}
