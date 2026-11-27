import type { Metadata, Viewport } from "next";
import { designOf } from "@/lib/content";
import { fontClasses, KOREAN_FONTS_HREF, STUDIO_FONTS_HREF } from "@/lib/fonts";
import { getSiteContent } from "@/lib/server/site-content";
import "@/styles/site.css";
import "@/styles/minimal.css";
import "@/styles/studio.css";
import "@/styles/admin.css";

export const metadata: Metadata = {
  title: "Редактор портфолио",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#1d1b18",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The editor switches data-design live; this is just the starting value.
  return (
    <html lang="ru" className={`${fontClasses} js`} data-design={designOf(await getSiteContent())} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={KOREAN_FONTS_HREF} />
        <link rel="stylesheet" href={STUDIO_FONTS_HREF} />
      </head>
      <body>{children}</body>
    </html>
  );
}
