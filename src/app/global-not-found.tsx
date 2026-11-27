import Link from "next/link";
import type { Metadata } from "next";
import { fontClasses } from "@/lib/fonts";
import "@/styles/site.css";

export const metadata: Metadata = {
  title: "404",
  robots: { index: false },
};

export default function GlobalNotFound() {
  return (
    <html lang="en" className={fontClasses}>
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
