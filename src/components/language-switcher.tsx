"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/i18n/config";

export function LanguageSwitcher({ lang, label }: { lang: Locale; label: string }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const rest = pathname.replace(/^\/(sq|en|de)(?=\/|$)/, "");
  const qs = search.toString();

  return (
    <nav aria-label={label} className="flex items-center rounded-[var(--radius-soft)] border border-line text-sm overflow-hidden">
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
          className={`px-2.5 py-1.5 font-semibold ${l === lang ? "bg-forest text-white" : "hover:bg-white"}`}
        >
          {l.toUpperCase()}
        </a>
      ))}
    </nav>
  );
}
