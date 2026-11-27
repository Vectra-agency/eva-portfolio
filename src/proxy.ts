import { NextResponse, type NextRequest } from "next/server";
import { LANG_COOKIE, detectLocale } from "@/lib/i18n";

/** Sends "/" and "/certificates" to the visitor's language: /ko, /ru or /en. */
export function proxy(req: NextRequest) {
  const locale = detectLocale({
    cookie: req.cookies.get(LANG_COOKIE)?.value,
    country: req.headers.get("x-vercel-ip-country"),
    acceptLanguage: req.headers.get("accept-language"),
  });
  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${req.nextUrl.pathname === "/" ? "" : req.nextUrl.pathname}`;
  const res = NextResponse.redirect(url, 307);
  res.headers.set("Vary", "Accept-Language, Cookie");
  return res;
}

export const config = {
  matcher: ["/", "/certificates"],
};
