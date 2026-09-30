import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Price } from "@/components/price";
import { notFound } from "next/navigation";
import { getDictionary, isLocale, plural, fill } from "@/i18n";
import { quoteRoom, roomBySlug, validateStay } from "@/lib/engine";
import { HOTEL } from "@/lib/hotel";
import { formatDate, formatMoney } from "@/lib/dates";
import { CheckoutForm } from "@/components/checkout-form";
import { describeDates, describeGuests } from "@/components/stay-summary";

export const dynamic = "force-dynamic";

const COUNTRY_CODES = ["XK", "AL", "MK", "ME", "RS", "DE", "CH", "AT", "IT", "FR", "BE", "NL", "SE", "NO", "DK", "FI", "GB", "IE", "US", "CA", "TR", "HR", "SI", "GR"];

export async function generateMetadata({ params }: PageProps<"/[lang]/book/[slug]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getDictionary(lang).checkout.title, robots: { index: false } };
}

export default async function CheckoutPage({ params, searchParams }: PageProps<"/[lang]/book/[slug]">) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const room = await roomBySlug(slug);
  if (!room) notFound();
  const t = getDictionary(lang);
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]);

  const stay = validateStay({
    checkIn: one("checkIn"),
    checkOut: one("checkOut"),
    adults: one("adults") ?? Math.min(2, room.maxAdults),
    children: one("children") ?? 0,
    rooms: one("rooms") ?? 1,
  });

  if (!stay.ok) {
    return (
      <div className="wrap pt-12 prose-measure">
        <h1 className="text-4xl">{room.name[lang]}</h1>
        <p role="alert" className="mt-6 text-danger">
          {fill(t.errors[stay.error], { max: HOTEL.maxNights })}
        </p>
        <Link href={`/${lang}/rooms/${slug}`} className="btn btn-primary mt-6">
          {t.results.change}
        </Link>
      </div>
    );
  }

  const q = stay.value;
  const quote = await quoteRoom(room, q);
  const back = `/${lang}/book?${new URLSearchParams({ checkIn: q.checkIn, checkOut: q.checkOut, adults: String(q.adults), children: String(q.children), rooms: String(q.rooms) })}`;

  const regionNames = new Intl.DisplayNames([lang === "sq" ? "sq" : lang], { type: "region" });
  const countries = COUNTRY_CODES.map((code) => ({ code, name: code === "XK" ? (lang === "sq" ? "Kosova" : lang === "de" ? "Kosovo" : "Kosovo") : regionNames.of(code) ?? code })).sort(
    (a, b) => (a.code === "XK" ? -1 : b.code === "XK" ? 1 : a.name.localeCompare(b.name, lang)),
  );

  return (
    <div className="wrap pt-10">
      <Link href={back} className="link text-[0.9375rem]">
        {t.results.change}
      </Link>
      <div className="mt-6 grid gap-10 lg:grid-cols-12">
        <aside className="lg:col-span-5 lg:col-start-8 lg:row-start-1">
          <div className="crest rounded-[var(--radius-soft)] p-6 sm:p-7 lg:sticky lg:top-24">
            <h2 className="font-sans text-base font-semibold text-white/75">{t.checkout.summary}</h2>
            <div className="mt-4 flex gap-4">
              <div className="relative size-20 shrink-0 overflow-hidden rounded-[4px]">
                <Image src={room.images[0]} alt="" fill sizes="80px" className="object-cover" />
              </div>
              <div>
                <p className="font-display text-2xl leading-tight">
                  {q.rooms > 1 && `${q.rooms} × `}
                  {room.name[lang]}
                </p>
                <p className="text-sm text-white/75 mt-1">{room.bed[lang]}</p>
              </div>
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-4 text-[0.9375rem]">
              <div>
                <dt className="text-white/60 text-sm">{t.search.checkIn}</dt>
                <dd>{formatDate(q.checkIn, lang)}</dd>
                <dd className="text-sm text-white/60">{fill(t.confirm.checkInTime, { time: HOTEL.checkInFrom })}</dd>
              </div>
              <div>
                <dt className="text-white/60 text-sm">{t.search.checkOut}</dt>
                <dd>{formatDate(q.checkOut, lang)}</dd>
                <dd className="text-sm text-white/60">{fill(t.confirm.checkOutTime, { time: HOTEL.checkOutUntil })}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-white/60 text-sm">{t.confirm.party}</dt>
                <dd>{describeGuests(lang, t, q)}</dd>
              </div>
            </dl>

            <details className="mt-6 border-t border-white/15 pt-4 text-[0.9375rem]">
              <summary className="cursor-pointer text-white/80">{t.checkout.nightlyBreakdown}</summary>
              <ul className="mt-3 space-y-1">
                {quote.nights.map((n) => (
                  <li key={n.date} className="flex justify-between tabular-nums">
                    <span>{formatDate(n.date, lang, { weekday: "short" })}</span>
                    <span>{formatMoney(n.priceCents * q.rooms, lang)}</span>
                  </li>
                ))}
              </ul>
            </details>

            <dl className="mt-4 border-t border-white/15 pt-4 space-y-1 tabular-nums">
              <div className="flex justify-between">
                <dt>{`${t.checkout.subtotal}, ${plural(lang, t.search.nights, quote.nights.length)}`}</dt>
                <dd>{formatMoney(quote.subtotalCents, lang)}</dd>
              </div>
              {quote.discountCents > 0 && (
                <div className="flex justify-between text-gold">
                  <dt>{t.checkout.discount}</dt>
                  <dd>−{formatMoney(quote.discountCents, lang)}</dd>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-2">
                <dt className="font-display">{t.checkout.total}</dt>
                <dd>
                  <Price cents={quote.totalCents} lang={lang} className="text-2xl text-gold" />
                </dd>
              </div>
              <p className="text-sm text-white/65 text-right">{t.checkout.included}</p>
            </dl>
          </div>
        </aside>

        <section className="lg:col-span-7 lg:row-start-1">
          <h1 className="text-4xl sm:text-5xl">{t.checkout.title}</h1>
          <p className="mt-2 mb-8 text-muted">
            {room.name[lang]}, {describeDates(lang, q)}
          </p>
          {quote.bookable ? (
            <CheckoutForm
              lang={lang}
              room={room.slug}
              stay={q}
              countries={countries}
              defaultCountry={lang === "de" ? "DE" : "XK"}
              errors={Object.fromEntries(Object.entries(t.errors).map(([k, v]) => [k, v.replace("{max}", String(HOTEL.maxNights))]))}
              labels={{ ...t.checkout, cancellation: fill(t.checkout.cancellation, { hours: HOTEL.freeCancellationHours }) }}
            />
          ) : (
            <div role="alert" className="rounded-[var(--radius-soft)] border border-line bg-mist p-5">
              <p>{quote.fitsParty ? t.errors.sold_out : t.results.doesNotFit}</p>
              <Link href={back} className="btn btn-primary mt-4">
                {t.results.change}
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
