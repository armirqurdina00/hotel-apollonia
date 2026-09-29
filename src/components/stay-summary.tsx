import { plural, type Dictionary, type Locale } from "@/i18n";
import { formatDate } from "@/lib/dates";
import type { StayQuery } from "@/lib/engine";

export function describeGuests(lang: Locale, t: Dictionary, q: Pick<StayQuery, "adults" | "children" | "rooms">) {
  return [
    plural(lang, t.search.adultsCount, q.adults),
    q.children ? plural(lang, t.search.childrenCount, q.children) : null,
    q.rooms > 1 ? plural(lang, t.search.roomsCount, q.rooms) : null,
  ]
    .filter(Boolean)
    .join(", ");
}

export function describeDates(lang: Locale, q: Pick<StayQuery, "checkIn" | "checkOut">) {
  return `${formatDate(q.checkIn, lang, { weekday: "short" })} – ${formatDate(q.checkOut, lang, { weekday: "short", year: true })}`;
}
