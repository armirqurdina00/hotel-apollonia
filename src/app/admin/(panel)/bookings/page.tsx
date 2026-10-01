import Link from "next/link";
import { and, desc, eq, gte, like, lt, or, type SQL } from "drizzle-orm";
import { db, bookings, roomTypes, BOOKING_STATUSES, type BookingStatus } from "@/db";
import { getAdminI18n, requireAdmin, STATUS_STYLE } from "@/lib/admin";
import { plural } from "@/i18n/config";
import { formatDate, formatMoney, isISODate, todayInGjakova } from "@/lib/dates";
import { DateField } from "@/components/ui/date-picker";
import { SelectField } from "@/components/ui/select";

export async function generateMetadata() {
  const { t } = await getAdminI18n();
  return { title: t.bookings.title };
}
export const dynamic = "force-dynamic";

const VIEWS = ["upcoming", "all", "past"] as const;

export default async function BookingsPage({ searchParams }: PageProps<"/admin/bookings">) {
  await requireAdmin();
  const { lang, t } = await getAdminI18n();
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const q = str("q").trim();
  const status = (BOOKING_STATUSES as readonly string[]).includes(str("status")) ? (str("status") as BookingStatus) : "";
  const view = (VIEWS as readonly string[]).includes(str("view")) ? (str("view") as (typeof VIEWS)[number]) : "upcoming";
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
        <h1 className="text-4xl">{t.bookings.title}</h1>
        <Link href="/admin/bookings/new" className="btn btn-primary">
          {t.bookings.add}
        </Link>
      </div>

      <form className="mt-6 grid gap-3 sm:grid-cols-[1fr_12rem_11rem_auto] items-end" action="/admin/bookings">
        <input type="hidden" name="view" value={view} />
        <div>
          <label className="field-label" htmlFor="q">
            {t.bookings.search}
          </label>
          <input id="q" name="q" defaultValue={q} placeholder={t.bookings.searchPlaceholder} className="field" />
        </div>
        <SelectField
          name="status"
          label={t.bookings.status}
          defaultValue={status}
          options={[{ value: "", label: t.bookings.anyStatus }, ...BOOKING_STATUSES.map((s) => ({ value: s, label: t.status[s] }))]}
        />
        <DateField lang={lang} name="date" label={t.bookings.inHouseOn} placeholder={t.bookings.anyDate} defaultValue={date} />
        <button className="btn btn-primary">{t.bookings.filter}</button>
      </form>

      <nav className="mt-6 flex gap-1 border-b border-line" aria-label={t.bookings.viewsLabel}>
        {VIEWS.map((k) => (
          <Link
            key={k}
            href={qs({ view: k })}
            aria-current={k === view ? "page" : undefined}
            className={`px-4 py-2 -mb-px border-b-2 ${k === view ? "border-forest font-semibold" : "border-transparent text-muted hover:text-ink"}`}
          >
            {t.bookings.views[k]}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="mt-8 text-muted">{t.bookings.none}</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-[var(--radius-soft)] border border-line bg-mist">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">{t.bookings.cols.guest}</th>
                <th className="px-4 py-3 font-semibold">{t.bookings.cols.stay}</th>
                <th className="px-4 py-3 font-semibold">{t.bookings.cols.room}</th>
                <th className="px-4 py-3 font-semibold text-right">{t.bookings.cols.total}</th>
                <th className="px-4 py-3 font-semibold">{t.bookings.cols.source}</th>
                <th className="px-4 py-3 font-semibold">{t.bookings.cols.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map(({ b, roomName }) => (
                // The guest link is stretched over the whole row, so any part of it opens the booking.
                <tr key={b.id} className="group relative cursor-pointer hover:bg-white">
                  <td className="px-4 py-3">
                    <Link href={`/admin/bookings/${b.id}`} className="font-semibold group-hover:text-emerald after:absolute after:inset-0 after:content-['']">
                      {b.firstName} {b.lastName}
                    </Link>
                    <div className="text-muted text-xs">{b.ref}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatDate(b.checkIn, lang, { weekday: "short" })} – {formatDate(b.checkOut, lang, { weekday: "short" })}
                    <div className="text-muted text-xs">
                      {plural(lang, t.nights, b.nights)}, {plural(lang, t.guests, b.adults + b.children)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {b.rooms > 1 && `${b.rooms} × `}
                    {roomName[lang]}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">{formatMoney(b.totalCents, lang)}</td>
                  <td className="px-4 py-3 text-muted">{t.source[b.source]}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${STATUS_STYLE[b.status]}`}>{t.status[b.status]}</span>
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
