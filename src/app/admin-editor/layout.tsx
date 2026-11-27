import type { Metadata, Viewport } from "next";
import { fontClasses, KOREAN_FONTS_HREF } from "@/lib/fonts";
import "@/styles/site.css";
import "@/styles/admin.css";

export const metadata: Metadata = {
  title: "Редактор портфолио",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#f5f1ea",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${fontClasses} js`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={KOREAN_FONTS_HREF} />
      </head>
      <body>{children}</body>
    </html>
  );
}
