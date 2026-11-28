import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LOCALES, isLocale, t } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { getSiteContent, pageDesign } from "@/lib/server/site-content";
import { SiteProvider } from "@/components/site/SiteContext";
import { HomePage } from "@/components/site/Pages";

export async function generateMetadata({ params }: PageProps<"/[locale]/[design]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const c = await getSiteContent();
  return {
    title: t(c.meta.title, locale),
    description: t(c.meta.description, locale),
    // Every design shows the same page: search engines index the plain address.
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

export default async function Page({ params }: PageProps<"/[locale]/[design]">) {
  const { locale, design } = await params;
  const resolved = await pageDesign(design);
  if (!resolved) notFound();
  return (
    <SiteProvider
      content={await getSiteContent()}
      locale={locale as Locale}
      page="home"
      design={resolved.design}
      urlDesign={resolved.named}
    >
      <HomePage />
    </SiteProvider>
  );
}
