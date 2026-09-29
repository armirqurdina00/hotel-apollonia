import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, bookings, roomTypes, type BookingStatus } from "@/db";
import { requireAdmin, SOURCE_LABEL, STATUS_LABEL, STATUS_STYLE } from "@/lib/admin";
import { formatDate, formatMoney } from "@/lib/dates";
import { bookingLink } from "@/lib/email";
import { saveInternalNote, setBookingStatus } from "../../../actions";

export const dynamic = "force-dynamic";

/** What reception can do next from each status. */
const NEXT: Record<BookingStatus, { status: BookingStatus; label: string; tone?: "danger" }[]> = {
  pending: [
    { status: "confirmed", label: "Confirm booking" },
    { status: "cancelled", label: "Cancel", tone: "danger" },
  ],
  confirmed: [
    { status: "checked_in", label: "Check in" },
    { status: "no_show", label: "Mark no-show", tone: "danger" },
    { status: "cancelled", label: "Cancel", tone: "danger" },
  ],
  checked_in: [{ status: "checked_out", label: "Check out" }],
  checked_out: [{ status: "checked_in", label: "Undo check-out" }],
  cancelled: [{ status: "confirmed", label: "Restore booking" }],
  no_show: [{ status: "confirmed", label: "Restore booking" }],
};

export default async function BookingDetail({ params, searchParams }: PageProps<"/admin/bookings/[id]">) {
  await requireAdmin();
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
    ["Room", `${b.rooms > 1 ? b.rooms + " × " : ""}${room.name.en}`],
    ["Arrival", formatDate(b.checkIn, "en", { weekday: "long", month: "long", year: true })],
    ["Departure", formatDate(b.checkOut, "en", { weekday: "long", month: "long", year: true })],
    ["Guests", `${b.adults} adult${b.adults > 1 ? "s" : ""}${b.children ? `, ${b.children} child${b.children > 1 ? "ren" : ""}` : ""}`],
    ["Expected arrival", b.arrivalTime ?? "Not given"],
    ["Parking", b.parking ? "Needs a space" : "No"],
    ["Source", SOURCE_LABEL[b.source]],
    ["Guest language", { sq: "Albanian", en: "English", de: "German" }[b.locale] ?? b.locale],
    ["Booked", b.createdAt + " UTC"],
  ];

  return (
    <div className="max-w-5xl">
      <Link href="/admin/bookings" className="link text-sm">
        All bookings
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <h1 className="text-4xl">
          {b.firstName} {b.lastName}
        </h1>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS_STYLE[b.status]}`}>{STATUS_LABEL[b.status]}</span>
      </div>
      <p className="mt-1 text-muted">{b.ref}</p>

      {sp.error === "full" && (
        <p role="alert" className="mt-4 rounded-[var(--radius-soft)] border border-danger/40 bg-white p-4 text-danger">
          This booking can&apos;t be restored: the room type is full on at least one of its nights.
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {NEXT[b.status].map((n) => (
          <form key={n.status} action={setBookingStatus} className="flex items-center gap-2">
            <input type="hidden" name="id" value={b.id} />
            <input type="hidden" name="status" value={n.status} />
            {n.status === "cancelled" && b.email && <input type="hidden" name="notify" value="on" />}
            <button className={`btn ${n.tone === "danger" ? "btn-ghost text-danger" : "btn-primary"}`}>{n.label}</button>
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
              <h2 className="font-sans text-base font-semibold">Guest&apos;s requests</h2>
              <p className="mt-2 whitespace-pre-line rounded-[var(--radius-soft)] bg-gold-soft p-4">{b.notes}</p>
            </section>
          )}

          <section>
            <h2 className="font-sans text-base font-semibold">Price per night</h2>
            <ul className="mt-2 divide-y divide-line rounded-[var(--radius-soft)] border border-line bg-mist text-sm tabular-nums">
              {b.nightly.map((n) => (
                <li key={n.date} className="flex justify-between px-4 py-2">
                  <span>{formatDate(n.date, "en", { weekday: "short", year: true })}</span>
                  <span>{formatMoney(n.cents * b.rooms, "en")}</span>
                </li>
              ))}
              <li className="flex justify-between px-4 py-2 font-semibold">
                <span>Total to collect (after discounts)</span>
                <span>{formatMoney(b.totalCents, "en")}</span>
              </li>
            </ul>
          </section>

          <form action={saveInternalNote}>
            <input type="hidden" name="id" value={b.id} />
            <label htmlFor="note" className="font-semibold">
              Staff note
            </label>
            <p className="text-sm text-muted">Only staff see this.</p>
            <textarea id="note" name="internalNote" rows={3} defaultValue={b.internalNote ?? ""} className="field mt-2" />
            <button className="btn btn-ghost mt-2">Save note</button>
          </form>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[var(--radius-soft)] border border-line bg-mist p-5">
            <h2 className="font-sans text-base font-semibold">Contact</h2>
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
              {b.country && <li className="text-muted">Country: {b.country}</li>}
            </ul>
          </div>
          <div className="rounded-[var(--radius-soft)] border border-line bg-mist p-5 text-sm">
            <h2 className="font-sans text-base font-semibold">Guest&apos;s booking page</h2>
            <p className="mt-1 text-muted">The same link the guest got by email. Send it again if they lost it.</p>
            <input readOnly value={bookingLink(b)} className="field mt-2 text-xs" aria-label="Guest booking link" />
          </div>
        </aside>
      </div>
    </div>
  );
}
