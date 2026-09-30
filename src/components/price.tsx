import type { ReactNode } from "react";
import { formatMoney } from "@/lib/dates";
import type { Locale } from "@/i18n/config";

/** A money amount in the price style (lining figures from the body font). */
export function Price({ cents, lang, className = "" }: { cents: number; lang: Locale; className?: string }) {
  return <span className={`price ${className}`}>{formatMoney(cents, lang)}</span>;
}

/** Fills "{price}" in a sentence with a rendered price, keeping each language's word order. */
export function withPrice(template: string, price: ReactNode) {
  const [head, tail = ""] = template.split("{price}");
  return (
    <>
      {head}
      {price}
      {tail}
    </>
  );
}
