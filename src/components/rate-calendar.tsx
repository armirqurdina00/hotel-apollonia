"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { addDays, addMonths, daysInMonth, formatMoney, monthStart, weekday, nightsBetween, formatDate, formatMonthYear, weekdayInitials } from "@/lib/dates";
import { plural, type Locale, type Plural } from "@/i18n/config";

type Day = { d: string; p: number; a: number; c: boolean };

export type CalendarLabels = {
  pickCheckIn: string;
  pickCheckOut: string;
  bookDates: string;
  soldOut: string;
  fewLeft: Plural;
  prevMonth: string;
  nextMonth: string;
  clear: string;
  loading: string;
  nights: Plural;
  total: string;
  discount: string;
};

type Props = {
  lang: Locale;
  slug: string;
  today: string;
  labels: CalendarLabels;
  /** Long-stay discount rules, mirrored from the server for the live total. */
  lengthOfStay: readonly { minNights: number; discount: number }[];
  adults: number;
  maxNights: number;
};

export function RateCalendar({ lang, slug, today, labels, lengthOfStay, adults, maxNights }: Props) {
  const [month, setMonth] = useState(monthStart(today));
  const [days, setDays] = useState<Map<string, Day>>(new Map());
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/rates?room=${slug}&month=${month}&months=3`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((json: { days: Day[] }) => {
        setDays((prev) => {
          const next = new Map(prev);
          for (const d of json.days) next.set(d.d, d);
          return next;
        });
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [slug, month]);

  const sellable = (d: string) => {
    const day = days.get(d);
    return !!day && d >= today && day.a > 0 && !day.c;
  };

  /** Can the guest stay every night from checkIn up to (not including) d? */
  const canCheckOutOn = (d: string) => {
    if (!checkIn || d <= checkIn) return false;
    const nights = nightsBetween(checkIn, d);
    return nights.length <= maxNights && nights.every(sellable);
  };

  function pick(d: string) {
    if (checkIn && !checkOut && canCheckOutOn(d)) {
      setCheckOut(d);
      return;
    }
    if (sellable(d)) {
      setCheckIn(d);
      setCheckOut(null);
    }
  }

  const loading = !days.has(month);
  const rangeEnd = checkOut ?? (checkIn && hover && canCheckOutOn(hover) ? hover : null);
  const inRange = (d: string) => !!checkIn && !!rangeEnd && d > checkIn && d < rangeEnd;

  const quote = useMemo(() => {
    if (!checkIn || !checkOut) return null;
    const nights = nightsBetween(checkIn, checkOut);
    const subtotal = nights.reduce((s, d) => s + (days.get(d)?.p ?? 0), 0);
    const rate = lengthOfStay.find((r) => nights.length >= r.minNights)?.discount ?? 0;
    const discount = Math.round((subtotal * rate) / 100) * 100;
    return { nights: nights.length, subtotal, rate, total: subtotal - discount };
  }, [checkIn, checkOut, days, lengthOfStay]);

  const months = [month, addMonths(month, 1)];
  const weekdayNames = weekdayInitials(lang);

  const status = !checkIn ? labels.pickCheckIn : !checkOut ? labels.pickCheckOut : null;

  return (
    <div className="crest rounded-[var(--radius-soft)] p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <button
          type="button"
          className="btn btn-ghost !min-h-10 !px-3 !py-1.5 disabled:opacity-30"
          onClick={() => setMonth(addMonths(month, -1))}
          disabled={month <= monthStart(today)}
          aria-label={labels.prevMonth}
        >
          ‹
        </button>
        <p className="text-sm text-white/80" aria-live="polite">
          {loading ? labels.loading : status}
        </p>
        <button type="button" className="btn btn-ghost !min-h-10 !px-3 !py-1.5" onClick={() => setMonth(addMonths(month, 1))} aria-label={labels.nextMonth}>
          ›
        </button>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {months.map((m, mi) => {
          const lead = (weekday(m) + 6) % 7; // Monday-first
          const count = daysInMonth(m);
          return (
            <div key={m} className={mi === 1 ? "hidden md:block" : ""}>
              <h3 className="font-display text-xl mb-3 capitalize">
                {formatMonthYear(m, lang)}
              </h3>
              <div className="grid grid-cols-7 gap-1 text-center">
                {weekdayNames.map((w, i) => (
                  <div key={i} aria-hidden className="text-xs text-white/60 pb-1">
                    {w}
                  </div>
                ))}
                {Array.from({ length: lead }, (_, i) => (
                  <div key={`b${i}`} />
                ))}
                {Array.from({ length: count }, (_, i) => {
                  const d = addDays(m, i);
                  const day = days.get(d);
                  const past = d < today;
                  const full = !!day && !past && (day.a === 0 || day.c);
                  const isIn = d === checkIn;
                  const isOut = d === rangeEnd;
                  const selectable = checkIn && !checkOut ? canCheckOutOn(d) || sellable(d) : sellable(d);
                  const few = day && day.a > 0 && day.a <= 2 && !past;
                  return (
                    <button
                      key={d}
                      type="button"
                      disabled={!selectable}
                      aria-pressed={isIn || isOut}
                      aria-label={`${formatDate(d, lang, { weekday: "long", month: "long" })}${day && !full && !past ? `, ${formatMoney(day.p, lang)}` : full ? `, ${labels.soldOut}` : ""}`}
                      onClick={() => pick(d)}
                      onMouseEnter={() => setHover(d)}
                      onFocus={() => setHover(d)}
                      className={[
                        "relative flex flex-col items-center justify-center rounded-[4px] h-14 sm:h-16 text-sm transition-colors",
                        isIn || isOut ? "bg-gold text-ink" : inRange(d) ? "bg-gold/30" : selectable ? "bg-white/[0.07] hover:bg-white/15" : "",
                        past ? "text-white/25" : full && !(checkIn && canCheckOutOn(d)) ? "text-white/40" : "",
                      ].join(" ")}
                    >
                      <span className="tabular-nums font-semibold leading-none">{i + 1}</span>
                      {!past && day && (
                        <span className={`mt-1 text-[0.6875rem] leading-none tabular-nums ${isIn || isOut ? "" : "opacity-80"}`}>
                          {full ? (checkIn && canCheckOutOn(d) ? "" : labels.soldOut) : formatMoney(day.p, lang)}
                        </span>
                      )}
                      {few && !full && !isIn && !isOut && <span aria-hidden className="absolute top-1 right-1 size-1.5 rounded-full bg-gold" />}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-5 border-t border-white/15 flex flex-wrap items-center gap-4 min-h-14">
        {quote ? (
          <>
            <div>
              <p className="font-display text-3xl tabular-nums">{formatMoney(quote.total, lang)}</p>
              <p className="text-sm text-white/75">
                {labels.total.replace("{nights}", plural(lang, labels.nights, quote.nights))}
                {quote.rate > 0 && `, ${labels.discount.replace("{pct}", String(Math.round(quote.rate * 100)))}`}
              </p>
            </div>
            <div className="ml-auto flex gap-3">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setCheckIn(null);
                  setCheckOut(null);
                }}
              >
                {labels.clear}
              </button>
              <Link href={`/${lang}/book/${slug}?checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}`} className="btn btn-gold">
                {labels.bookDates}
              </Link>
            </div>
          </>
        ) : (
          <p className="text-sm text-white/70">
            <span aria-hidden className="inline-block size-1.5 rounded-full bg-gold mr-2 align-middle" />
            {labels.fewLeft.other.replace("{n}", "1–2")}
          </p>
        )}
      </div>
    </div>
  );
}
