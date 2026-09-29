import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, isLocale, plural, fill } from "@/i18n";
import { roomBySlug } from "@/lib/engine";
import { HOTEL, PRICING } from "@/lib/hotel";
import { todayInGjakova } from "@/lib/dates";
import { RateCalendar } from "@/components/rate-calendar";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[lang]/rooms/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const room = await roomBySlug(slug);
  if (!room) return {};
  return {
    title: room.name[lang],
    description: room.summary[lang],
    alternates: { canonical: `/${lang}/rooms/${slug}` },
    openGraph: { images: [room.images[0]] },
  };
}

export default async function RoomPage({ params }: PageProps<"/[lang]/rooms/[slug]">) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const room = await roomBySlug(slug);
  if (!room) notFound();
  const t = getDictionary(lang);

  return (
    <div className="wrap pt-8">
      <Link href={`/${lang}/rooms`} className="link text-[0.9375rem]">
        {t.rooms.back}
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7 grid grid-cols-3 gap-3 content-start">
          <div className={`relative ${room.images.length > 1 ? "col-span-2" : "col-span-3"} row-span-2 aspect-[4/5] overflow-hidden rounded-[var(--radius-soft)]`}>
            <Image src={room.images[0]} alt={room.name[lang]} fill priority sizes="(min-width: 1024px) 38vw, 66vw" className="object-cover" />
          </div>
          {room.images.slice(1, 3).map((src) => (
            <div key={src} className="relative overflow-hidden rounded-[var(--radius-soft)]">
              <Image src={src} alt="" fill sizes="(min-width: 1024px) 19vw, 33vw" className="object-cover" />
            </div>
          ))}
        </div>
        <div className="lg:col-span-5">
          <h1 className="text-4xl sm:text-5xl">{room.name[lang]}</h1>
          <p className="mt-5 text-lg">{room.summary[lang]}</p>
          <p className="mt-3 text-muted">{room.description[lang]}</p>
          <dl className="mt-8 grid grid-cols-3 gap-4 border-y border-line py-5 text-[0.9375rem]">
            <div>
              <dt className="text-muted text-sm">{t.rooms.sizeLabel}</dt>
              <dd className="font-semibold">{fill(t.rooms.size, { n: room.sizeM2 })}</dd>
            </div>
            <div>
              <dt className="text-muted text-sm">{t.search.guests}</dt>
              <dd className="font-semibold">{plural(lang, t.rooms.upTo, room.maxAdults + room.maxChildren)}</dd>
            </div>
            <div>
              <dt className="text-muted text-sm">{t.rooms.bedLabel}</dt>
              <dd className="font-semibold">{room.bed[lang]}</dd>
            </div>
          </dl>
          <h2 className="mt-8 font-sans font-semibold text-base">{t.rooms.amenitiesTitle}</h2>
          <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-[0.9375rem]">
            {room.amenities.map((a) => (
              <li key={a} className="flex gap-2.5">
                <span aria-hidden className="mt-2.5 h-px w-3 bg-forest shrink-0" />
                {t.amenities[a] ?? a}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <section className="mt-16" aria-labelledby="cal">
        <div className="grid gap-4 lg:grid-cols-12 mb-6">
          <h2 id="cal" className="text-3xl sm:text-4xl lg:col-span-5">
            {t.rooms.calendarTitle}
          </h2>
          <p className="lg:col-span-6 lg:col-start-7 text-muted self-end">
            {t.rooms.calendarLead} {fill(t.checkout.cancellation, { hours: HOTEL.freeCancellationHours })}
          </p>
        </div>
        <RateCalendar
          lang={lang}
          slug={room.slug}
          today={todayInGjakova()}
          adults={Math.min(2, room.maxAdults)}
          maxNights={HOTEL.maxNights}
          lengthOfStay={PRICING.lengthOfStay}
          labels={{
            pickCheckIn: t.rooms.pickCheckIn,
            pickCheckOut: t.rooms.pickCheckOut,
            bookDates: t.rooms.bookDates,
            soldOut: t.rooms.soldOut,
            fewLeft: t.rooms.fewLeft,
            prevMonth: t.rooms.prevMonth,
            nextMonth: t.rooms.nextMonth,
            clear: t.rooms.clear,
            loading: t.rooms.loading,
            nights: t.search.nights,
            total: t.results.total,
            discount: t.results.discount,
          }}
        />
      </section>
    </div>
  );
}
