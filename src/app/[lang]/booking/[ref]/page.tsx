import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, bookings, roomTypes } from "@/db";
import { getDictionary, isLocale, fill } from "@/i18n";
import { verifyBookingToken } from "@/lib/auth";
import { cancellationOpen } from "@/lib/engine";
import { HOTEL } from "@/lib/hotel";
import { formatDate } from "@/lib/dates";
import { Price } from "@/components/price";
import { describeGuests } from "@/components/stay-summary";
import { CancelBooking } from "@/components/booking-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function BookingPage({ params, searchParams }: PageProps<"/[lang]/booking/[ref]">) {
  const { lang, ref } = await params;
  if (!isLocale(lang)) notFound();
  const sp = await searchParams;
  const token = typeof sp.t === "string" ? sp.t : "";
  if (!verifyBookingToken(ref, token)) notFound();

  const [row] = await db
    .select({ booking: bookings, room: roomTypes })
    .from(bookings)
    .innerJoin(roomTypes, eq(bookings.roomTypeId, roomTypes.id))
    .where(eq(bookings.ref, ref))
    .limit(1);
  if (!row) notFound();

  const t = getDictionary(lang);
  const { booking: b, room } = row;
  const cancelled = b.status === "cancelled";
  const isNew = sp.new === "1";
  const canCancel = (b.status === "pending" || b.status === "confirmed") && cancellationOpen(b.checkIn);

  return (
    <div className="wrap pt-12">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {cancelled ? (
            <h1 className="text-4xl sm:text-5xl">{t.confirm.cancelled}</h1>
          ) : (
            <>
              <h1 className="text-4xl sm:text-5xl">{isNew ? t.confirm.title : `${b.firstName}, ${room.name[lang]}`}</h1>
              <p className="mt-4 text-lg text-muted prose-measure">{fill(t.confirm.lead, { email: b.email })}</p>
            </>
          )}

          <div className="mt-8 rounded-[var(--radius-soft)] border border-line bg-mist">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-5 sm:p-6">
              <div>
                <p className="text-sm text-muted">{t.confirm.ref}</p>
                <p className="font-display text-3xl tracking-wide">{b.ref}</p>
              </div>
              <p
                className={`rounded-full px-3 py-1 text-sm font-semibold ${cancelled ? "bg-danger/10 text-danger" : b.status === "pending" ? "bg-gold-soft text-forest" : "bg-ok/10 text-ok"}`}
              >
                {t.confirm.status[b.status]}
              </p>
            </div>
            <dl className="grid gap-5 p-5 sm:p-6 sm:grid-cols-2 text-[0.9375rem]">
              <div>
                <dt className="text-sm text-muted">{t.confirm.guest}</dt>
                <dd>
                  {b.firstName} {b.lastName}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted">{t.confirm.room}</dt>
                <dd>
                  {b.rooms > 1 && `${b.rooms} × `}
                  {room.name[lang]}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted">{t.search.checkIn}</dt>
                <dd>{formatDate(b.checkIn, lang)}</dd>
                <dd className="text-sm text-muted">{fill(t.confirm.checkInTime, { time: HOTEL.checkInFrom })}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">{t.search.checkOut}</dt>
                <dd>{formatDate(b.checkOut, lang)}</dd>
                <dd className="text-sm text-muted">{fill(t.confirm.checkOutTime, { time: HOTEL.checkOutUntil })}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">{t.confirm.party}</dt>
                <dd>{describeGuests(lang, t, b)}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">{t.confirm.total}</dt>
                <dd className="mt-0.5">
                  <Price cents={b.totalCents} lang={lang} className="text-xl text-emerald" />
                </dd>
                <dd className="text-sm text-muted">{t.checkout.included}</dd>
              </div>
            </dl>
          </div>

          {!cancelled && (
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={`/api/booking/${b.ref}/ics?t=${token}`} className="btn btn-primary">
                {t.confirm.addToCalendar}
              </a>
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(HOTEL.mapsQuery)}`} className="btn btn-ghost" target="_blank" rel="noopener">
                {t.confirm.directions}
              </a>
            </div>
          )}

          <div className="mt-10 border-t border-line pt-6 space-y-4">
            {canCancel && !cancelled && (
              <>
                <p className="text-sm text-muted">{fill(t.checkout.cancellation, { hours: HOTEL.freeCancellationHours })}</p>
                <CancelBooking
                  lang={lang}
                  refCode={b.ref}
                  token={token}
                  labels={{
                    cancel: t.confirm.cancel,
                    confirm: t.confirm.cancelConfirm,
                    keep: t.confirm.cancelKeep,
                    question: t.confirm.cancelQuestion,
                    tooLate: t.confirm.cancelTooLate,
                    generic: t.errors.generic,
                  }}
                />
              </>
            )}
            {!canCancel && !cancelled && <p className="text-sm text-muted">{t.confirm.cancelTooLate}</p>}
            <p className="text-sm">
              {fill(t.confirm.questions, { phone: "" })}
              <a href={HOTEL.phoneHref} className="link">
                {HOTEL.phone}
              </a>
            </p>
          </div>
        </div>
        <div className="lg:col-span-4 lg:col-start-9">
          <div className="relative aspect-[3/4] overflow-hidden rounded-[var(--radius-soft)]">
            <Image src={room.images[0]} alt="" fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover" />
          </div>
        </div>
      </div>
    </div>
  );
}
