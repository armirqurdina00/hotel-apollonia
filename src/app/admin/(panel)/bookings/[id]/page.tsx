import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, bookings, roomTypes, type BookingStatus } from "@/db";
import { getAdminI18n, requireAdmin, STATUS_STYLE } from "@/lib/admin";
import { formatDate, formatDateTime, formatMoney } from "@/lib/dates";
import { fill, plural } from "@/i18n/config";
import type { AdminDict } from "@/i18n/admin";
import { bookingLink } from "@/lib/email";
import { saveInternalNote, setBookingStatus } from "../../../actions";

export const dynamic = "force-dynamic";

/** What reception can do next from each status. */
type Action = keyof AdminDict["booking"]["actions"];
const NEXT: Record<BookingStatus, { status: BookingStatus; label: Action; tone?: "danger" }[]> = {
  pending: [
    { status: "confirmed", label: "confirm" },
    { status: "cancelled", label: "cancel", tone: "danger" },
  ],
  confirmed: [
    { status: "checked_in", label: "checkIn" },
    { status: "no_show", label: "noShow", tone: "danger" },
    { status: "cancelled", label: "cancel", tone: "danger" },
  ],
  checked_in: [{ status: "checked_out", label: "checkOut" }],
  checked_out: [{ status: "checked_in", label: "undoCheckOut" }],
  cancelled: [{ status: "confirmed", label: "restore" }],
  no_show: [{ status: "confirmed", label: "restore" }],
};

export async function generateMetadata({ params }: PageProps<"/admin/bookings/[id]">) {
  const [b] = await db
    .select({ firstName: bookings.firstName, lastName: bookings.lastName })
    .from(bookings)
    .where(eq(bookings.id, Number((await params).id)))
    .limit(1);
  return { title: b ? `${b.firstName} ${b.lastName}` : undefined };
}

export default async function BookingDetail({ params, searchParams }: PageProps<"/admin/bookings/[id]">) {
  await requireAdmin();
  const { lang, t } = await getAdminI18n();
  const { id } = await params;
  const sp = await searchParams;
  const [row] = await db
    .select({ b: bookings, room: roomTypes })
    .from(bookings)
    .innerJoin(roomTypes, eq(bookings.roomTypeId, roomTypes.id))
    .where(eq(bookings.id, Number(id)))
    .limit(1);
  if (!row) notFound();
  const { b, room } = row;

  const info: [string, React.ReactNode][] = [
    [t.booking.room, `${b.rooms > 1 ? b.rooms + " × " : ""}${room.name[lang]}`],
    [t.booking.arrival, formatDate(b.checkIn, lang, { weekday: "long", month: "long", year: true })],
    [t.booking.departure, formatDate(b.checkOut, lang, { weekday: "long", month: "long", year: true })],
    [t.booking.guests, [plural(lang, t.adults, b.adults), b.children && plural(lang, t.children, b.children)].filter(Boolean).join(", ")],
    [t.booking.expectedArrival, b.arrivalTime ?? t.booking.notGiven],
    [t.booking.parking, b.parking ? t.booking.needsSpace : t.booking.no],
    [t.booking.source, t.source[b.source]],
    [t.booking.guestLanguage, t.guestLang[b.locale as keyof typeof t.guestLang] ?? b.locale],
    [t.booking.booked, formatDateTime(b.createdAt, lang)],
  ];

  return (
    <div className="max-w-5xl">
      <Link href="/admin/bookings" className="link text-sm">
        {t.booking.back}
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <h1 className="text-4xl">
          {b.firstName} {b.lastName}
        </h1>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS_STYLE[b.status]}`}>{t.status[b.status]}</span>
      </div>
      <p className="mt-1 text-muted">{b.ref}</p>

      {sp.error === "full" && (
        <p role="alert" className="mt-4 rounded-[var(--radius-soft)] border border-danger/40 bg-white p-4 text-danger">
          {t.booking.restoreFull}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {NEXT[b.status].map((n) => (
          <form key={n.status} action={setBookingStatus} className="flex items-center gap-2">
            <input type="hidden" name="id" value={b.id} />
            <input type="hidden" name="status" value={n.status} />
            {n.status === "cancelled" && b.email && <input type="hidden" name="notify" value="on" />}
            <button className={`btn ${n.tone === "danger" ? "btn-ghost text-danger" : "btn-primary"}`}>{t.booking.actions[n.label]}</button>
          </form>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-8">
          <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-4 rounded-[var(--radius-soft)] border border-line bg-mist p-5">
            {info.map(([k, v]) => (
              <div key={k}>
                <dt className="text-sm text-muted">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>

          {b.notes && (
            <section>
              <h2 className="font-sans text-base font-semibold">{t.booking.requests}</h2>
              <p className="mt-2 whitespace-pre-line rounded-[var(--radius-soft)] bg-gold-soft p-4">{b.notes}</p>
            </section>
          )}

          <section>
            <h2 className="font-sans text-base font-semibold">{t.booking.pricePerNight}</h2>
            <ul className="mt-2 divide-y divide-line rounded-[var(--radius-soft)] border border-line bg-mist text-sm tabular-nums">
              {b.nightly.map((n) => (
                <li key={n.date} className="flex justify-between px-4 py-2">
                  <span>{formatDate(n.date, lang, { weekday: "short", year: true })}</span>
                  <span>{formatMoney(n.cents * b.rooms, lang)}</span>
                </li>
              ))}
              <li className="flex justify-between px-4 py-2 font-semibold">
                <span>{t.booking.totalToCollect}</span>
                <span>{formatMoney(b.totalCents, lang)}</span>
              </li>
            </ul>
          </section>

          <form action={saveInternalNote}>
            <input type="hidden" name="id" value={b.id} />
            <label htmlFor="note" className="font-semibold">
              {t.booking.staffNote}
            </label>
            <p className="text-sm text-muted">{t.booking.staffOnly}</p>
            <textarea id="note" name="internalNote" rows={3} defaultValue={b.internalNote ?? ""} className="field mt-2" />
            <button className="btn btn-ghost mt-2">{t.booking.saveNote}</button>
          </form>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[var(--radius-soft)] border border-line bg-mist p-5">
            <h2 className="font-sans text-base font-semibold">{t.booking.contact}</h2>
            <ul className="mt-2 space-y-1.5 break-words">
              <li>
                <a className="link" href={`tel:${b.phone.replace(/[^+\d]/g, "")}`}>
                  {b.phone}
                </a>
              </li>
              <li>
                <a className="link" href={`https://wa.me/${b.phone.replace(/[^\d]/g, "")}`} target="_blank" rel="noopener">
                  WhatsApp
                </a>
              </li>
              {b.email && (
                <li>
                  <a className="link" href={`mailto:${b.email}?subject=${encodeURIComponent(`Hotel Apollonia ${b.ref}`)}`}>
                    {b.email}
                  </a>
                </li>
              )}
              {b.country && <li className="text-muted">{fill(t.booking.country, { country: b.country })}</li>}
            </ul>
          </div>
          <div className="rounded-[var(--radius-soft)] border border-line bg-mist p-5 text-sm">
            <h2 className="font-sans text-base font-semibold">{t.booking.bookingPage}</h2>
            <p className="mt-1 text-muted">{t.booking.bookingPageLead}</p>
            <input readOnly value={bookingLink(b)} className="field mt-2 text-xs" aria-label={t.booking.bookingLink} />
          </div>
        </aside>
      </div>
    </div>
  );
}
