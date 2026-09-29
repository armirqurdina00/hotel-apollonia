export const LOCALES = ["sq", "en", "de"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "sq";

export const LOCALE_NAMES: Record<Locale, string> = { sq: "Shqip", en: "English", de: "Deutsch" };

export function isLocale(v: string): v is Locale {
  return (LOCALES as readonly string[]).includes(v);
}

export type Plural = { one: string; other: string };

const rules = new Map<Locale, Intl.PluralRules>();
/** Picks the plural form and fills in {n}. */
export function plural(locale: Locale, forms: Plural, n: number) {
  let r = rules.get(locale);
  if (!r) rules.set(locale, (r = new Intl.PluralRules(locale)));
  return (r.select(n) === "one" ? forms.one : forms.other).replace("{n}", String(n));
}

/** Replaces {name} placeholders. */
export function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? `{${k}}`));
}
