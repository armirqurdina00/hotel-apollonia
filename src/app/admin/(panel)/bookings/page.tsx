import Link from "next/link";
import { and, desc, eq, gte, like, lt, or, type SQL } from "drizzle-orm";
import { db, bookings, roomTypes, BOOKING_STATUSES, type BookingStatus } from "@/db";
import { requireAdmin, SOURCE_LABEL, STATUS_LABEL, STATUS_STYLE } from "@/lib/admin";
import { formatDate, formatMoney, isISODate, todayInGjakova } from "@/lib/dates";
import { DateField } from "@/components/ui/date-picker";
import { SelectField } from "@/components/ui/select";

export const metadata = { title: "Bookings" };
export const dynamic = "force-dynamic";

const VIEWS = {
  upcoming: "Upcoming",
  all: "All",
  past: "Past",
} as const;

export default async function BookingsPage({ searchParams }: PageProps<"/admin/bookings">) {
  await requireAdmin();
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const q = str("q").trim();
  const status = (BOOKING_STATUSES as readonly string[]).includes(str("status")) ? (str("status") as BookingStatus) : "";
  const view = (str("view") in VIEWS ? str("view") : "upcoming") as keyof typeof VIEWS;
  const date = isISODate(str("date")) ? str("date") : "";
  const today = todayInGjakova();

  const where: SQL[] = [];
  if (status) where.push(eq(bookings.status, status));
  if (view === "upcoming") where.push(gte(bookings.checkOut, today));
  if (view === "past") where.push(lt(bookings.checkOut, today));
  if (date) where.push(and(lt(bookings.checkIn, date + "~"), gte(bookings.checkOut, date))!);
  if (q) {
    const pat = `%${q}%`;
    where.push(or(like(bookings.ref, pat), like(bookings.firstName, pat), like(bookings.lastName, pat), like(bookings.email, pat), like(bookings.phone, pat))!);
  }

  const rows = await db
    .select({ b: bookings, roomName: roomTypes.name })
    .from(bookings)
    .innerJoin(roomTypes, eq(bookings.roomTypeId, roomTypes.id))
    .where(where.length ? and(...where) : undefined)
    .orderBy(view === "past" ? desc(bookings.checkIn) : bookings.checkIn)
    .limit(300);

  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ ...(q && { q }), ...(status && { status }), view, ...(date && { date }), ...patch });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return `/admin/bookings?${p}`;
  };

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl">Bookings</h1>
        <Link href="/admin/bookings/new" className="btn btn-primary">
          Add booking
        </Link>
      </div>

      <form className="mt-6 grid gap-3 sm:grid-cols-[1fr_12rem_11rem_auto] items-end" action="/admin/bookings">
        <input type="hidden" name="view" value={view} />
        <div>
          <label className="field-label" htmlFor="q">
            Search
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Name, booking number, email or phone" className="field" />
        </div>
        <SelectField name="status" label="Status" defaultValue={status} options={[{ value: "", label: "Any status" }, ...BOOKING_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))]} />
        <DateField lang="en" name="date" label="In house on" placeholder="Any date" defaultValue={date} />
        <button className="btn btn-primary">Filter</button>
      </form>

      <nav className="mt-6 flex gap-1 border-b border-line" aria-label="Views">
        {Object.entries(VIEWS).map(([k, label]) => (
          <Link
            key={k}
            href={qs({ view: k })}
            aria-current={k === view ? "page" : undefined}
            className={`px-4 py-2 -mb-px border-b-2 ${k === view ? "border-forest font-semibold" : "border-transparent text-muted hover:text-ink"}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="mt-8 text-muted">No bookings match these filters.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-[var(--radius-soft)] border border-line bg-mist">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Guest</th>
                <th className="px-4 py-3 font-semibold">Stay</th>
                <th className="px-4 py-3 font-semibold">Room</th>
                <th className="px-4 py-3 font-semibold text-right">Total</th>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map(({ b, roomName }) => (
                <tr key={b.id} className="hover:bg-white">
                  <td className="px-4 py-3">
                    <Link href={`/admin/bookings/${b.id}`} className="font-semibold hover:text-emerald">
                      {b.firstName} {b.lastName}
                    </Link>
                    <div className="text-muted text-xs">{b.ref}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatDate(b.checkIn, "en", { weekday: "short" })} – {formatDate(b.checkOut, "en", { weekday: "short" })}
                    <div className="text-muted text-xs">
                      {b.nights} night{b.nights > 1 ? "s" : ""}, {b.adults + b.children} guest{b.adults + b.children > 1 ? "s" : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {b.rooms > 1 && `${b.rooms} × `}
                    {roomName.en}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(b.totalCents, "en")}</td>
                  <td className="px-4 py-3 text-muted">{SOURCE_LABEL[b.source]}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${STATUS_STYLE[b.status]}`}>{STATUS_LABEL[b.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
