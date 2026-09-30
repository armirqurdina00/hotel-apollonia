import { NextResponse, type NextRequest } from "next/server";
import { LOCALES, DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/auth";

function preferredLocale(req: NextRequest): Locale {
  const saved = req.cookies.get("apl_locale")?.value;
  if (saved && (LOCALES as readonly string[]).includes(saved)) return saved as Locale;
  const header = req.headers.get("accept-language") ?? "";
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { lang: tag.slice(0, 2).toLowerCase(), q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { lang } of ranked) if ((LOCALES as readonly string[]).includes(lang)) return lang as Locale;
  return DEFAULT_LOCALE;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") return NextResponse.next();
    // Optimistic check; every admin page and action verifies again on the server.
    const ok = await verifyAdminSession(req.cookies.get(ADMIN_COOKIE)?.value);
    if (!ok) {
      const url = new URL("/admin/login", req.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const hasLocale = LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (hasLocale) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = `/${preferredLocale(req)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api|_next|images|photos|media|brand|favicon.ico|icon|apple-icon|robots.txt|sitemap.xml|manifest.webmanifest|.*\\..*).*)"],
};
