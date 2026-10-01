import { setAdminLang } from "@/app/admin/actions";
import { ADMIN_DICTIONARIES, ADMIN_LANGS, type AdminLang } from "@/i18n/admin";

/** Shqip / English toggle for the staff panel. */
export function AdminLangSwitch({ lang, tone = "dark" }: { lang: AdminLang; tone?: "dark" | "light" }) {
  return (
    <form action={setAdminLang} role="group" aria-label={ADMIN_DICTIONARIES[lang].language} className="flex gap-1">
      {ADMIN_LANGS.map((l) => (
        <button
          key={l}
          name="lang"
          value={l}
          aria-pressed={l === lang}
          className={`rounded-[4px] px-2.5 py-1 text-sm ${
            l === lang
              ? tone === "dark"
                ? "bg-white/15 font-semibold text-white"
                : "bg-emerald font-semibold text-white"
              : tone === "dark"
                ? "text-white/70 hover:bg-white/10 hover:text-white"
                : "text-muted hover:bg-mist hover:text-ink"
          }`}
        >
          {ADMIN_DICTIONARIES[l].langName}
        </button>
      ))}
    </form>
  );
}
