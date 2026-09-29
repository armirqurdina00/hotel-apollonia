"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/i18n/config";

export function LanguageSwitcher({ lang, label, tone = "light" }: { lang: Locale; label: string; tone?: "light" | "dark" }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const rest = pathname.replace(/^\/(sq|en|de)(?=\/|$)/, "");
  const qs = search.toString();

  return (
    <nav aria-label={label} className={`flex w-fit items-center rounded-[var(--radius-soft)] border text-sm overflow-hidden ${tone === "dark" ? "border-white/25" : "border-line"}`}>
      {LOCALES.map((l) => (
        <a
          key={l}
          href={`/${l}${rest}${qs ? `?${qs}` : ""}`}
          hrefLang={l}
          lang={l}
          aria-current={l === lang ? "true" : undefined}
          title={LOCALE_NAMES[l]}
          onClick={() => {
            document.cookie = `apl_locale=${l};path=/;max-age=31536000;samesite=lax`;
          }}
          className={`grid min-h-11 min-w-11 place-items-center px-2.5 font-semibold ${
            l === lang ? (tone === "dark" ? "bg-gold text-ink" : "bg-forest text-white") : tone === "dark" ? "hover:bg-white/10" : "hover:bg-mist"
          }`}
        >
          {l.toUpperCase()}
        </a>
      ))}
    </nav>
  );
}
