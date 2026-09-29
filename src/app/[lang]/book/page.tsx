import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, isLocale, plural, fill, type Dictionary, type Locale } from "@/i18n";
import { searchStays, validateStay, type Quote, type StayQuery } from "@/lib/engine";
import { HOTEL } from "@/lib/hotel";
import { formatMoney, todayInGjakova, addDays } from "@/lib/dates";
import { SearchPanel } from "@/components/search-panel";
import { searchLabels } from "@/components/search-labels";
import { describeDates, describeGuests } from "@/components/stay-summary";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[lang]/book">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getDictionary(lang).nav.book, robots: { index: false } };
}

export default async function BookPage({ params, searchParams }: PageProps<"/[lang]/book">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const sp = await searchParams;
  const today = todayInGjakova();
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]);

  const hasQuery = Boolean(one("checkIn"));
  const stay = hasQuery
    ? validateStay({ checkIn: one("checkIn"), checkOut: one("checkOut"), adults: one("adults"), children: one("children"), rooms: one("rooms") })
    : null;
  const quotes = stay?.ok ? await searchStays(stay.value) : [];
  const q = stay?.ok ? stay.value : null;

  return (
    <>
      <div className="crest">
        <div className="wrap py-10">
          <h1 className="text-4xl sm:text-5xl mb-8">{q ? t.results.title : t.nav.book}</h1>
          <SearchPanel
            lang={lang}
            labels={searchLabels(t, q ? t.search.update : t.search.submit)}
            today={today}
            layout="bar"
            initial={{
              checkIn: q?.checkIn ?? today,
              checkOut: q?.checkOut ?? addDays(today, 1),
              adults: q?.adults,
              children: q?.children,
              rooms: q?.rooms,
            }}
          />
        </div>
      </div>

      <div className="wrap pt-8">
        {stay && !stay.ok && (
          <p role="alert" className="rounded-[var(--radius-soft)] border border-danger/40 bg-white p-4 text-danger">
            {fill(t.errors[stay.error], { max: HOTEL.maxNights })}
          </p>
        )}

        {q && (
          <>
            <p className="text-muted">{fill(t.results.for, { dates: describeDates(lang, q), guests: describeGuests(lang, t, q) })}</p>
            {!quotes.some((x) => x.bookable) && (
              <p role="status" className="mt-6 rounded-[var(--radius-soft)] bg-mist border border-line p-5 prose-measure">
                {t.results.none}{" "}
                <a href={HOTEL.phoneHref} className="link">
                  {HOTEL.phone}
                </a>
              </p>
            )}
            <ul className="mt-4">
              {quotes.map((quote) => (
                <ResultRow key={quote.room.id} quote={quote} stay={q} lang={lang} t={t} />
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}

function ResultRow({ quote, stay, lang, t }: { quote: Quote; stay: StayQuery; lang: Locale; t: Dictionary }) {
  const { room } = quote;
  const qs = new URLSearchParams({
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    adults: String(stay.adults),
    children: String(stay.children),
    rooms: String(stay.rooms),
  });
  return (
    <li className={`grid gap-5 sm:grid-cols-[14rem_1fr] lg:grid-cols-[16rem_1fr_16rem] py-7 border-t border-line first:border-t-0 ${quote.bookable ? "" : "opacity-60"}`}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-soft)]">
        <Image src={room.images[0]} alt="" fill sizes="16rem" className="object-cover" />
      </div>
      <div>
        <h2 className="text-2xl sm:text-3xl">
          <Link href={`/${lang}/rooms/${room.slug}`} className="hover:text-emerald">
            {room.name[lang]}
          </Link>
        </h2>
        <p className="mt-2 text-muted">{room.summary[lang]}</p>
        <p className="mt-3 text-sm">
          {fill(t.rooms.size, { n: room.sizeM2 })}, {room.bed[lang]}, {plural(lang, t.rooms.upTo, room.maxAdults + room.maxChildren)}
        </p>
        {quote.bookable && quote.minAvailable <= 3 && <p className="mt-3 text-sm font-semibold text-forest">{plural(lang, t.results.left, quote.minAvailable)}</p>}
      </div>
      <div className="sm:col-start-2 lg:col-start-3 lg:text-right flex flex-col lg:items-end">
        {quote.bookable ? (
          <>
            <p className="font-display text-3xl tabular-nums">{formatMoney(quote.totalCents, lang)}</p>
            <p className="text-sm text-muted">{fill(t.results.total, { nights: plural(lang, t.search.nights, quote.nights.length) })}</p>
            {quote.discountRate > 0 && (
              <p className="text-sm text-ok font-semibold">{fill(t.results.discount, { pct: Math.round(quote.discountRate * 100) })}</p>
            )}
            <Link href={`/${lang}/book/${room.slug}?${qs}`} className="btn btn-primary mt-4 w-full lg:w-auto">
              {t.results.select}
            </Link>
          </>
        ) : (
          <p className="text-[0.9375rem] font-semibold">{quote.fitsParty ? t.results.unavailable : t.results.doesNotFit}</p>
        )}
      </div>
    </li>
  );
}
