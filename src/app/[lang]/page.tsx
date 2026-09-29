import Image from "next/image";
import { notFound } from "next/navigation";
import { getDictionary, isLocale, fill } from "@/i18n";
import { activeRooms, fromPrices } from "@/lib/engine";
import { HOTEL } from "@/lib/hotel";
import { todayInGjakova } from "@/lib/dates";
import { SearchPanel } from "@/components/search-panel";
import { searchLabels, formLabels } from "@/components/search-labels";
import { RoomRow } from "@/components/room-row";
import { InquiryForm } from "@/components/inquiry-form";

export const dynamic = "force-dynamic";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const today = todayInGjakova();
  const rooms = await activeRooms();
  const from = await fromPrices(rooms);
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(HOTEL.mapsQuery)}&hl=${lang}&z=15&output=embed`;

  return (
    <>
      {/* Hero: the crest panel sits over a photo of the hotel entrance. */}
      <section className="relative">
        <div className="wrap grid lg:grid-cols-12 lg:min-h-[min(46rem,calc(100dvh-4.5rem))] pt-0 lg:pt-10 pb-10">
          <div className="relative -mx-4 sm:-mx-8 lg:mx-0 lg:col-start-6 lg:col-span-7 lg:row-start-1 h-80 sm:h-[28rem] lg:h-full overflow-hidden lg:rounded-[var(--radius-soft)]">
            <Image
              src="/photos/entrance.jpg"
              alt="Hotel Apollonia, Rruga Tirana, Gjakovë"
              fill
              priority
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="object-cover object-[56%_62%] animate-settle"
            />
          </div>
          <div className="relative lg:col-start-1 lg:col-span-6 lg:row-start-1 lg:self-center -mt-10 lg:mt-0 z-10">
            <div className="crest crest-frame rounded-[var(--radius-soft)] p-7 sm:p-10 shadow-[0_30px_60px_-30px_rgb(34_27_22/0.6)]">
              <h1 className="text-[2.125rem] sm:text-5xl leading-[1.08]">{t.hero.title}</h1>
              <p className="mt-5 text-white/80 max-w-[34rem]">{t.hero.lead}</p>
              <div className="mt-7">
                <SearchPanel lang={lang} labels={searchLabels(t)} today={today} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Facts */}
      <section aria-label={HOTEL.name} className="border-y border-line bg-mist">
        <ul className="wrap grid grid-cols-2 md:grid-cols-5 gap-x-6 gap-y-5 py-7 text-[0.9375rem]">
          <li className="col-span-2 md:col-span-1 flex items-center gap-3">
            <span className="font-display text-4xl text-emerald leading-none">{HOTEL.guestRating.score}</span>
            <span className="text-muted leading-snug">{fill(t.facts.rating, { source: HOTEL.guestRating.source })}</span>
          </li>
          <li>{t.facts.breakfast}</li>
          <li>{t.facts.parking}</li>
          <li>{t.facts.reception}</li>
          <li>{t.facts.restaurant}</li>
        </ul>
      </section>

      {/* Rooms */}
      <section id="rooms" className="wrap pt-20 scroll-mt-20">
        <div className="grid lg:grid-cols-12 gap-6 mb-6">
          <h2 className="text-4xl sm:text-5xl lg:col-span-5">{t.rooms.title}</h2>
          <p className="lg:col-span-6 lg:col-start-7 text-muted self-end">{t.rooms.lead}</p>
        </div>
        <div>
          {rooms.map((r, i) => (
            <RoomRow key={r.id} room={r} lang={lang} t={t} fromCents={from.get(r.id)!} priority={i === 0} />
          ))}
        </div>
      </section>

      {/* Restaurant */}
      <section id="restaurant" className="mt-20 bg-mist border-y border-line scroll-mt-20">
        <div className="wrap py-20 grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-6 grid grid-cols-5 gap-3 content-start">
            <div className="col-span-3 relative aspect-[3/4] overflow-hidden rounded-[var(--radius-soft)]">
              <Image src="/photos/restaurant.jpg" alt="" fill sizes="(min-width: 1024px) 30vw, 60vw" className="object-cover" />
            </div>
            <div className="col-span-2 grid gap-3 content-end">
              <div className="relative aspect-square overflow-hidden rounded-[var(--radius-soft)]">
                <Image src="/photos/breakfast.jpg" alt="" fill sizes="(min-width: 1024px) 20vw, 40vw" className="object-cover" />
              </div>
              <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-soft)]">
                <Image src="/photos/coffee.jpg" alt="" fill sizes="(min-width: 1024px) 20vw, 40vw" className="object-cover" />
              </div>
            </div>
          </div>
          <div className="lg:col-span-5 lg:col-start-8">
            <h2 className="text-4xl sm:text-5xl">{t.restaurant.title}</h2>
            <p className="mt-5 text-muted">{t.restaurant.lead}</p>
            <h3 className="mt-8 font-sans font-semibold text-base">{t.restaurant.hours}</h3>
            <ul className="mt-2 space-y-1 tabular-nums">
              <li>{t.restaurant.breakfastHours}</li>
              <li>{t.restaurant.kitchenHours}</li>
              <li>{t.restaurant.barHours}</li>
            </ul>
            <h3 className="mt-10 text-2xl">{t.restaurant.reserve}</h3>
            <p className="mt-2 mb-5 text-muted text-[0.9375rem]">{t.restaurant.reserveLead}</p>
            <InquiryForm kind="table" lang={lang} today={today} labels={formLabels(t, t.forms.sentTable)} withTime />
            <p className="mt-4 text-sm text-muted">
              {fill(t.restaurant.callBar, { phone: "" })}
              <a href={HOTEL.barPhoneHref} className="link">
                {HOTEL.barPhone}
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Meetings */}
      <section id="meetings" className="wrap pt-20 scroll-mt-20 grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h2 className="text-4xl sm:text-5xl">{t.meetings.title}</h2>
          <p className="mt-5 text-muted">{t.meetings.lead}</p>
          <ul className="mt-6 space-y-3">
            {t.meetings.points.map((p) => (
              <li key={p} className="flex gap-3">
                <span aria-hidden className="mt-2.5 h-px w-4 bg-forest shrink-0" />
                {p}
              </li>
            ))}
          </ul>
          <div className="relative mt-8 aspect-[16/10] overflow-hidden rounded-[var(--radius-soft)]">
            <Image src="/photos/dining-set.jpg" alt="" fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
          </div>
        </div>
        <div className="lg:col-span-6 lg:col-start-7 lg:pt-3">
          <div className="rounded-[var(--radius-soft)] border border-line bg-mist p-6 sm:p-8">
            <h3 className="text-2xl">{t.meetings.ask}</h3>
            <p className="mt-2 mb-6 text-muted text-[0.9375rem]">{t.meetings.askLead}</p>
            <InquiryForm kind="meeting" lang={lang} today={today} labels={formLabels(t, t.forms.sentMeeting)} />
          </div>
        </div>
      </section>

      {/* Location */}
      <section id="location" className="pt-24 scroll-mt-20">
        <div className="wrap grid gap-6 lg:grid-cols-12">
          <h2 className="text-4xl sm:text-5xl lg:col-span-5">{t.location.title}</h2>
          <p className="lg:col-span-6 lg:col-start-7 text-muted self-end">{t.location.lead}</p>
        </div>
        <div className="mt-10 grid grid-cols-2 md:grid-cols-[2fr_1fr] gap-3 wrap">
          <div className="relative col-span-2 md:col-span-1 aspect-[16/9] md:aspect-auto md:row-span-2 overflow-hidden rounded-[var(--radius-soft)]">
            <Image src="/images/bazaar-shops.jpg" alt="Çarshia e Madhe" fill sizes="(min-width: 768px) 66vw, 100vw" className="object-cover" />
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-soft)]">
            <Image src="/images/bazaar-restaurant.jpg" alt="" fill sizes="(min-width: 768px) 33vw, 50vw" className="object-cover" />
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-soft)]">
            <Image src="/images/bazaar-street.jpg" alt="" fill sizes="(min-width: 768px) 33vw, 50vw" className="object-cover object-left" />
          </div>
        </div>
        <p className="wrap mt-2 text-xs text-muted">{t.location.photoCredit}</p>

        <div className="wrap mt-12 grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5 space-y-8">
            <div>
              <h3 className="font-sans font-semibold text-base">{t.location.address}</h3>
              <p className="mt-1">
                {HOTEL.name}
                <br />
                {HOTEL.street}, {HOTEL.postalCode} {HOTEL.city}
              </p>
              <a className="link mt-2 inline-block" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(HOTEL.mapsQuery)}`} target="_blank" rel="noopener">
                {t.location.directions}
              </a>
            </div>
            <div>
              <h3 className="font-sans font-semibold text-base">{t.location.arriving}</h3>
              <p className="mt-1 text-muted">{t.location.arrivingText}</p>
            </div>
            <div>
              <h3 className="font-sans font-semibold text-base">{t.location.nearby}</h3>
              <ul className="mt-2 divide-y divide-line border-y border-line">
                {t.location.places.map((p) => (
                  <li key={p.name} className="flex flex-wrap justify-between gap-x-4 py-2.5">
                    <span>{p.name}</span>
                    <span className="text-muted text-[0.9375rem]">{p.note}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="lg:col-span-7 min-h-80 overflow-hidden rounded-[var(--radius-soft)] border border-line">
            <iframe title={t.location.title} src={mapSrc} className="h-full min-h-80 w-full grayscale-[0.4]" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="wrap pt-24 grid gap-8 lg:grid-cols-12">
        <h2 className="text-4xl sm:text-5xl lg:col-span-5">{t.faq.title}</h2>
        <div className="lg:col-span-7 border-t border-line">
          {t.faq.items.map((item) => (
            <details key={item.q} className="group border-b border-line">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                {item.q}
                <span aria-hidden className="text-2xl font-normal text-emerald transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="pb-6 -mt-1 text-muted prose-measure">
                {fill(item.a, { checkIn: HOTEL.checkInFrom, checkOut: HOTEL.checkOutUntil, hours: HOTEL.freeCancellationHours })}
              </p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
