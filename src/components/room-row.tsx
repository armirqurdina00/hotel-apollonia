import Image from "next/image";
import Link from "next/link";
import type { RoomType } from "@/db";
import { plural, fill, type Dictionary, type Locale } from "@/i18n";
import { Price, withPrice } from "./price";
import { CardPendingOverlay, PendingMarker } from "./link-spinner";

export function RoomRow({ room, lang, t, fromCents, priority }: { room: RoomType; lang: Locale; t: Dictionary; fromCents: number; priority?: boolean }) {
  const href = `/${lang}/rooms/${room.slug}`;
  return (
    // Phones and small tablets: a card; wider: a row divided from the next by a line.
    // The room name's link is stretched over the whole card, so any part of it opens the room.
    <article className="group relative grid md:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] md:gap-10 md:border-t md:border-line md:py-7 md:first:border-t-0 max-md:mb-5 max-md:overflow-hidden max-md:rounded-[var(--radius-soft)] max-md:border max-md:border-line max-md:bg-white max-md:shadow-[0_8px_24px_-16px_rgb(12_58_39/0.35)]">
      <div className="relative overflow-hidden md:rounded-[var(--radius-soft)] aspect-[5/4] bg-line">
        <Image
          src={room.images[0]}
          alt=""
          width={900}
          height={675}
          priority={priority}
          sizes="(min-width: 768px) 40vw, 100vw"
          className="h-full w-full object-cover object-[50%_60%] transition-transform duration-500 group-hover:scale-[1.02]"
        />
        <CardPendingOverlay />
      </div>
      <div className="flex flex-col max-md:p-4 max-md:pb-5">
        <h3 className="text-3xl">
          <Link href={href} className="group-hover:text-emerald after:absolute after:inset-0 after:content-['']">
            {room.name[lang]}
            <PendingMarker />
          </Link>
        </h3>
        <p className="mt-2 font-display text-muted">
          {withPrice(t.rooms.from, <Price cents={fromCents} lang={lang} className="text-xl text-emerald" />)} {t.rooms.perNight}
        </p>
        <p className="mt-3 text-muted prose-measure">{room.summary[lang]}</p>
        <dl className="mt-5 grid grid-cols-3 gap-4 max-w-md text-sm">
          <div>
            <dt className="text-muted">{t.rooms.sizeLabel}</dt>
            <dd className="font-semibold">{fill(t.rooms.size, { n: room.sizeM2 })}</dd>
          </div>
          <div>
            <dt className="text-muted">{t.search.guests}</dt>
            <dd className="font-semibold">{plural(lang, t.rooms.upTo, room.maxAdults + room.maxChildren)}</dd>
          </div>
          <div>
            <dt className="text-muted">{t.rooms.bedLabel}</dt>
            <dd className="font-semibold">{room.bed[lang]}</dd>
          </div>
        </dl>
        <div className="mt-6 md:mt-auto md:pt-6">
          {/* Looks like a link; the card itself is the link (see the room name). */}
          <span aria-hidden className="link font-semibold">
            {t.rooms.view}
          </span>
        </div>
      </div>
    </article>
  );
}
