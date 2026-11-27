import { Cormorant_Garamond, Inter } from "next/font/google";
import type { Design } from "./types";

export const display = Cormorant_Garamond({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

export const sans = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  display: "swap",
});

export const fontClasses = `${display.variable} ${sans.variable}`;

/** Korean faces are large, so they're loaded from Google Fonts only where Korean text appears. */
export const KOREAN_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&family=Noto+Serif+KR:wght@400;500;600&display=swap";

/** "Studio" design: Kanit (Latin) with Montserrat covering Cyrillic. */
export const STUDIO_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700;800;900&family=Montserrat:wght@300;400;500;600;700;800;900&display=swap";

export const THEME_COLOR: Record<Design, string> = {
  minimal: "#ffffff",
  editorial: "#f5f1ea",
  studio: "#0c0c0c",
};
