import { NextResponse, type NextRequest } from "next/server";
import { LANG_COOKIE, detectLocale, isLocale } from "@/lib/i18n";
import { DEFAULT_DESIGN_SEGMENT, isDesign } from "@/lib/content";

/**
 * - "/", "/certificates", "/studio", "/studio/certificates" → the visitor's language: /ko, /ru or /en (+ the rest).
 * - "/ru", "/ru/certificates" → served by /ru/_ (the design chosen in the editor), the address stays the same.
 * - "/ru/_…" is the internal address of the above, so it redirects back to the public one.
 * - anything else that looks like a page → the 404 page.
 */
export function proxy(req: NextRequest) {
  const parts = req.nextUrl.pathname.split("/").filter(Boolean);
  const url = req.nextUrl.clone();
  const isPage = (rest: string[]) => rest.length === 0 || (rest.length === 1 && rest[0] === "certificates");

  if (isLocale(parts[0])) {
    const [locale, ...rest] = parts;
    if (rest[0] === DEFAULT_DESIGN_SEGMENT) {
      url.pathname = "/" + [locale, ...rest.slice(1)].join("/");
      return NextResponse.redirect(url, 308);
    }
    if (isPage(rest)) {
      url.pathname = "/" + [locale, DEFAULT_DESIGN_SEGMENT, ...rest].join("/");
      return NextResponse.rewrite(url);
    }
    if (isDesign(rest[0]) && isPage(rest.slice(1))) return NextResponse.next();
    return notFound(url);
  }

  if (isPage(parts) || (isDesign(parts[0]) && isPage(parts.slice(1)))) {
    const locale = detectLocale({
      cookie: req.cookies.get(LANG_COOKIE)?.value,
      country: req.headers.get("x-vercel-ip-country"),
      acceptLanguage: req.headers.get("accept-language"),
    });
    url.pathname = "/" + [locale, ...parts].join("/");
    const res = NextResponse.redirect(url, 307);
    res.headers.set("Vary", "Accept-Language, Cookie");
    return res;
  }
  return notFound(url);
}

/**
 * Typos like /ru/studoi would otherwise reach the page with a bad design and get a bare error page:
 * send them to an address no route matches, which shows the site's own 404 page.
 */
function notFound(url: URL) {
  url.pathname = "/404";
  return NextResponse.rewrite(url);
}

export const config = {
  // Every page address; not files (anything with a dot), Next.js internals, the API, the editor or uploads.
  matcher: ["/((?!_next|__next|api|admin-editor|uploads|studio/avatar)[^.]*)"],
};
