import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Price, withPrice } from "@/components/price";
import { notFound } from "next/navigation";
import { getDictionary, isLocale, plural, fill, type Dictionary, type Locale } from "@/i18n";
import { searchStays, validateStay, type Quote, type StayQuery } from "@/lib/engine";
import { HOTEL } from "@/lib/hotel";
import { getSiteSettings } from "@/lib/settings";
import { todayInGjakova, addDays } from "@/lib/dates";
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
  const { contact, links } = await getSiteSettings();
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
                <a href={links.phone} className="link">
                  {contact.phone}
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
    <li className={`grid gap-5 sm:grid-cols-[14rem_1fr] lg:grid-cols-[16rem_1fr_auto] lg:gap-8 py-7 border-t border-line first:border-t-0 ${quote.bookable ? "" : "opacity-60"}`}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-soft)]">
        <Image src={room.images[0]} alt="" fill sizes="16rem" className="object-cover" />
      </div>
      <div>
        <h2 className="text-2xl sm:text-3xl">
          <Link href={`/${lang}/rooms/${room.slug}`} className="hover:text-emerald">
            {room.name[lang]}
          </Link>
        </h2>
        {quote.bookable ? (
          <div className="mt-2">
            <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <Price cents={quote.totalCents} lang={lang} className="text-2xl text-emerald" />
              {quote.discountCents > 0 && (
                <>
                  <s className="text-muted">
                    <Price cents={quote.subtotalCents} lang={lang} className="!font-normal" />
                  </s>
                  <span title={fill(t.results.discount, { pct: Math.round(quote.discountRate * 100) })} className="rounded-full bg-gold-soft px-2 py-0.5 text-xs font-semibold text-forest">−{Math.round(quote.discountRate * 100)}%</span>
                </>
              )}
            </p>
            <p className="mt-1 font-display text-sm text-muted">
              {fill(t.results.total, { nights: plural(lang, t.search.nights, quote.nights.length) })} ·{" "}
              {withPrice(t.results.perNight, <Price cents={Math.round(quote.totalCents / quote.nights.length / 100) * 100} lang={lang} />)}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-[0.9375rem] font-semibold">{quote.fitsParty ? t.results.unavailable : t.results.doesNotFit}</p>
        )}
        <p className="mt-3 text-muted">{room.summary[lang]}</p>
        <p className="mt-2 text-sm">
          {fill(t.rooms.size, { n: room.sizeM2 })}, {room.bed[lang]}, {plural(lang, t.rooms.upTo, room.maxAdults + room.maxChildren)}
        </p>
        {quote.bookable && (
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-forest">
            {[t.amenities.breakfast, t.results.freeCancel].map((perk) => (
              <li key={perk} className="flex items-center gap-1.5">
                <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 shrink-0 fill-none stroke-emerald [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2]">
                  <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
                </svg>
                {perk}
              </li>
            ))}
          </ul>
        )}
        {quote.bookable && quote.minAvailable <= 3 && <p className="mt-3 text-sm font-semibold text-forest">{plural(lang, t.results.left, quote.minAvailable)}</p>}
      </div>
      {quote.bookable && (
        <div className="sm:col-start-2 lg:col-start-3 lg:self-end">
          <Link href={`/${lang}/book/${room.slug}?${qs}`} className="btn btn-primary w-full lg:w-auto">
            {t.results.select}
          </Link>
        </div>
      )}
    </li>
  );
}
