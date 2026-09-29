import "server-only";
import en from "./en";
import sq from "./sq";
import de from "./de";
import type { Locale } from "./config";

const dictionaries = { en, sq, de };

export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}

export type { Dictionary } from "./en";
export * from "./config";
