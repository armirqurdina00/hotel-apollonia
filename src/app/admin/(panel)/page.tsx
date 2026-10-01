import Link from "next/link";
import { and, asc, eq, gt, inArray, lt, count } from "drizzle-orm";
import { db, bookings, roomTypes, inquiries, HOLDING_STATUSES } from "@/db";
import { getAdminI18n, requireAdmin, STATUS_STYLE } from "@/lib/admin";
import { fill, plural } from "@/i18n/config";
import type { AdminDict, AdminLang } from "@/i18n/admin";
import { addDays, addMonths, formatDate, formatMoney, monthStart, nightsBetween, todayInGjakova } from "@/lib/dates";

export async function generateMetadata() {
  const { t } = await getAdminI18n();
  return { title: t.nav.today };
}
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  await requireAdmin();
  const { lang, t } = await getAdminI18n();
  const today = todayInGjakova();
  const horizon = addDays(today, 14);
  const mStart = monthStart(today);
  const mEnd = addMonths(mStart, 1);

  const [rooms, upcoming, monthRows, [newInq]] = await Promise.all([
    db.select().from(roomTypes).where(eq(roomTypes.active, true)),
    db
      .select({ b: bookings, roomName: roomTypes.name })
      .from(bookings)
      .innerJoin(roomTypes, eq(bookings.roomTypeId, roomTypes.id))
      .where(and(inArray(bookings.status, [...HOLDING_STATUSES, "checked_out"]), lt(bookings.checkIn, horizon), gt(bookings.checkOut, today)))
      .orderBy(asc(bookings.checkIn)),
    db
      .select({ nightly: bookings.nightly, rooms: bookings.rooms, total: bookings.totalCents, nights: bookings.nights })
      .from(bookings)
      .where(and(inArray(bookings.status, [...HOLDING_STATUSES, "checked_out"]), lt(bookings.checkIn, mEnd), gt(bookings.checkOut, mStart))),
    db.select({ n: count() }).from(inquiries).where(eq(inquiries.status, "new")),
  ]);

  const totalRooms = rooms.reduce((s, r) => s + r.inventory, 0);
  const active = upcoming.filter((x) => x.b.status !== "checked_out");
  const arrivals = active.filter((x) => x.b.checkIn === today);
  const departures = upcoming.filter((x) => x.b.checkOut === today && x.b.status !== "cancelled");
  const inHouse = active.filter((x) => x.b.checkIn <= today && x.b.checkOut > today);
  const occupiedTonight = inHouse.reduce((s, x) => s + x.b.rooms, 0);

  const days = nightsBetween(today, horizon).map((d) => {
    const occ = active.filter((x) => x.b.checkIn <= d && d < x.b.checkOut).reduce((s, x) => s + x.b.rooms, 0);
    return { d, occ, pct: totalRooms ? occ / totalRooms : 0 };
  });

  // Room revenue earned on nights inside this calendar month, after long-stay discounts.
  const monthRevenue = monthRows.reduce((sum, r) => {
    const gross = r.nightly.reduce((s, n) => s + n.cents, 0) * r.rooms;
    const ratio = gross ? r.total / gross : 1;
    return sum + r.nightly.filter((n) => n.date >= mStart && n.date < mEnd).reduce((s, n) => s + n.cents * r.rooms * ratio, 0);
  }, 0);

  const pendingCount = active.filter((x) => x.b.status === "pending").length;

  const stats = [
    { label: t.dashboard.occupiedTonight, value: `${occupiedTonight} / ${totalRooms}`, note: fill(t.dashboard.occupancy, { pct: Math.round((occupiedTonight / Math.max(1, totalRooms)) * 100) }) },
    { label: t.dashboard.arrivalsToday, value: arrivals.length },
    { label: t.dashboard.departuresToday, value: departures.length },
    { label: t.dashboard.revenue, value: formatMoney(monthRevenue, lang), note: t.dashboard.revenueNote },
  ];

  return (
    <div className="max-w-6xl">
      <h1 className="text-4xl first-letter:uppercase">{formatDate(today, lang, { weekday: "long", month: "long", year: true })}</h1>

      {(pendingCount > 0 || newInq.n > 0) && (
        <div className="mt-5 flex flex-wrap gap-3">
          {pendingCount > 0 && (
            <Link href="/admin/bookings?status=pending" className="rounded-[var(--radius-soft)] bg-gold-soft px-4 py-2.5 font-semibold text-forest">
              {plural(lang, t.dashboard.pending, pendingCount)}
            </Link>
          )}
          {newInq.n > 0 && (
            <Link href="/admin/inquiries" className="rounded-[var(--radius-soft)] bg-gold-soft px-4 py-2.5 font-semibold text-forest">
              {plural(lang, t.dashboard.newRequests, newInq.n)}
            </Link>
          )}
        </div>
      )}

      <dl className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-[var(--radius-soft)] border border-line bg-line">
        {stats.map((s) => (
          <div key={s.label} className="bg-mist p-5">
            <dt className="text-sm text-muted">{s.label}</dt>
            <dd className="font-display text-3xl mt-1 tabular-nums">{s.value}</dd>
            {s.note && <dd className="text-xs text-muted mt-1">{s.note}</dd>}
          </div>
        ))}
      </dl>

      <section className="mt-10">
        <h2 className="font-sans text-base font-semibold">{t.dashboard.occupancyTitle}</h2>
        <div className="mt-4 grid grid-cols-14 gap-1.5 items-end h-40" role="img" aria-label={t.dashboard.occupancyLabel}>
          {days.map((x) => (
            <div key={x.d} className="flex h-full flex-col justify-end items-center gap-1" title={`${x.d}: ${x.occ}/${totalRooms}`}>
              <span className="text-[0.6875rem] tabular-nums text-muted">{Math.round(x.pct * 100)}%</span>
              <div className="w-full rounded-t-[3px] bg-emerald" style={{ height: `${Math.max(2, x.pct * 100)}%`, opacity: 0.35 + x.pct * 0.65 }} />
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-14 gap-1.5 text-center text-[0.6875rem] text-muted">
          {days.map((x) => (
            <span key={x.d}>{formatDate(x.d, lang, { weekday: "short" }).replace(/ .*/, "").replace(",", "")}</span>
          ))}
        </div>
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <GuestList title={t.dashboard.arriving} rows={arrivals} empty={t.dashboard.noArrivals} lang={lang} t={t} />
        <GuestList title={t.dashboard.leaving} rows={departures} empty={t.dashboard.noDepartures} lang={lang} t={t} />
      </div>
      <div className="mt-8">
        <GuestList title={t.dashboard.inHouse} rows={inHouse} empty={t.dashboard.noInHouse} lang={lang} t={t} />
      </div>
    </div>
  );
}

function GuestList({
  title,
  rows,
  empty,
  lang,
  t,
}: {
  title: string;
  rows: { b: typeof bookings.$inferSelect; roomName: Record<AdminLang, string> }[];
  empty: string;
  lang: AdminLang;
  t: AdminDict;
}) {
  return (
    <section>
      <h2 className="font-sans text-base font-semibold mb-3">
        {title} <span className="text-muted font-normal">({rows.length})</span>
      </h2>
      {rows.length === 0 ? (
        <p className="text-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-line rounded-[var(--radius-soft)] border border-line bg-mist">
          {rows.map(({ b, roomName }) => (
            <li key={b.id}>
              <Link href={`/admin/bookings/${b.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-white">
                <span className="font-semibold">
                  {b.firstName} {b.lastName}
                </span>
                <span className="text-muted">
                  {b.rooms > 1 && `${b.rooms} × `}
                  {roomName[lang]}, {plural(lang, t.nights, b.nights)}
                </span>
                {b.arrivalTime && <span className="text-muted">{fill(t.dashboard.arrives, { time: b.arrivalTime })}</span>}
                {b.parking && <span className="text-xs rounded bg-black/5 px-1.5 py-0.5">{t.dashboard.parking}</span>}
                <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[b.status]}`}>{t.status[b.status]}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
