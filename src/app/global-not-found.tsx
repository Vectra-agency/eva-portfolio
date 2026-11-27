import Link from "next/link";
import type { Metadata } from "next";
import content from "@content/content.json";
import { designOf } from "@/lib/content";
import { fontClasses, STUDIO_FONTS_HREF } from "@/lib/fonts";
import type { Content } from "@/lib/types";
import "@/styles/site.css";
import "@/styles/minimal.css";
import "@/styles/studio.css";

export const metadata: Metadata = {
  title: "404",
  robots: { index: false },
};

export default function GlobalNotFound() {
  const design = designOf(content as Content);
  return (
    <html lang="en" className={fontClasses} data-design={design}>
      {design === "studio" && (
        <head>
          <link rel="stylesheet" href={STUDIO_FONTS_HREF} />
        </head>
      )}
      <body>
        <main className="not-found">
          <p className="not-found__code">404</p>
          <Link href="/" className="back-link">
            ← Eva Rovenskaia
          </Link>
        </main>
      </body>
    </html>
  );
}
