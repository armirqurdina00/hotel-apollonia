import Link from "next/link";
import { and, asc, gte, lt } from "drizzle-orm";
import { db, roomTypes, dayOverrides } from "@/db";
import { getAdminI18n, requireAdmin } from "@/lib/admin";
import { fill, plural } from "@/i18n/config";
import { nightlyGrid } from "@/lib/engine";
import { addDays, formatDate, formatMoney, isISODate, nightsBetween, todayInGjakova, weekday } from "@/lib/dates";
import { OverrideForm } from "@/components/admin/override-form";

export async function generateMetadata() {
  const { t } = await getAdminI18n();
  return { title: t.calendar.title };
}
export const dynamic = "force-dynamic";

const SPAN = 21;

export default async function CalendarPage({ searchParams }: PageProps<"/admin/calendar">) {
  await requireAdmin();
  const { lang, t } = await getAdminI18n();
  const c = t.calendar;
  const sp = await searchParams;
  const today = todayInGjakova();
  const from = typeof sp.from === "string" && isISODate(sp.from) ? sp.from : today;
  const to = addDays(from, SPAN);
  const selRoom = Number(sp.room) || 0;
  const selDate = typeof sp.date === "string" && isISODate(sp.date) ? sp.date : "";

  const rooms = await db.select().from(roomTypes).orderBy(asc(roomTypes.sortOrder));
  const [grid, overrides] = await Promise.all([
    nightlyGrid(rooms, from, to),
    db.select().from(dayOverrides).where(and(gte(dayOverrides.date, from), lt(dayOverrides.date, to))),
  ]);
  const ovr = new Map(overrides.map((o) => [`${o.roomTypeId}:${o.date}`, o]));
  const dates = nightsBetween(from, to);
  const selected = selRoom && selDate ? ovr.get(`${selRoom}:${selDate}`) : undefined;

  return (
    <div>
      <h1 className="text-4xl">{c.title}</h1>
      <p className="mt-2 text-muted max-w-2xl">{c.lead}</p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Link className="btn btn-ghost !min-h-10 !py-1.5" href={`/admin/calendar?from=${addDays(from, -SPAN)}`}>
          {c.earlier}
        </Link>
        <Link className="btn btn-ghost !min-h-10 !py-1.5" href="/admin/calendar">
          {c.today}
        </Link>
        <Link className="btn btn-ghost !min-h-10 !py-1.5" href={`/admin/calendar?from=${addDays(from, SPAN)}`}>
          {c.later}
        </Link>
        <span className="ml-3 text-muted">
          {formatDate(from, lang, { month: "long" })} – {formatDate(addDays(to, -1), lang, { month: "long", year: true })}
        </span>
      </div>

      <div className="mt-4 overflow-x-auto rounded-[var(--radius-soft)] border border-line bg-mist">
        <table className="border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-mist px-3 py-2 text-left font-semibold min-w-40">{c.roomType}</th>
              {dates.map((d) => {
                const wd = weekday(d);
                return (
                  <th key={d} className={`px-1 py-2 font-normal min-w-16 ${wd === 5 || wd === 6 ? "bg-gold-soft/50" : ""} ${d === today ? "text-emerald font-semibold" : "text-muted"}`}>
                    {formatDate(d, lang, { weekday: "short" }).split(",")[0]}
                    <div className="text-ink text-sm">{d.slice(8)}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rooms.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <th className="sticky left-0 z-10 bg-mist px-3 py-2 text-left font-semibold">
                  {r.name[lang]}
                  <div className="font-normal text-muted">{plural(lang, t.roomCount, r.inventory)}</div>
                </th>
                {grid.get(r.id)!.map((n) => {
                  const o = ovr.get(`${r.id}:${n.date}`);
                  const fullness = r.inventory ? 1 - n.available / r.inventory : 1;
                  const isSel = r.id === selRoom && n.date === selDate;
                  return (
                    <td key={n.date} className="p-0.5">
                      <Link
                        href={`/admin/calendar?from=${from}&room=${r.id}&date=${n.date}#edit`}
                        className={`relative block rounded-[3px] px-1 py-1.5 text-center tabular-nums ${isSel ? "ring-2 ring-gold" : ""} ${
                          n.closed ? "bg-[repeating-linear-gradient(45deg,#e7e5df_0_4px,#f8f8f5_4px_8px)] text-muted" : ""
                        }`}
                        style={n.closed ? undefined : { backgroundColor: `rgb(11 107 67 / ${0.06 + fullness * 0.7})`, color: fullness > 0.55 ? "white" : undefined }}
                        title={
                          fill(c.cellTitle, { room: r.name[lang], date: formatDate(n.date, lang, { weekday: "short" }), free: n.available, total: r.inventory }) +
                          (o?.blockedUnits ? fill(c.heldBack, { n: o.blockedUnits }) : "")
                        }
                      >
                        <span className="block font-semibold text-sm">{n.closed ? c.closed : `${n.available}/${r.inventory}`}</span>
                        <span className="block whitespace-nowrap">{formatMoney(n.priceCents, lang)}</span>
                        {o && (o.priceCents != null || o.blockedUnits > 0) && <span aria-label={c.changed} className="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-gold" />}
                      </Link>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">{c.legend}</p>

      <section id="edit" className="mt-10 max-w-3xl scroll-mt-6">
        <h2 className="text-2xl">{c.edit}</h2>
        <OverrideForm
          key={`${selRoom}:${selDate}`}
          rooms={rooms.map((r) => ({ id: r.id, name: r.name[lang] }))}
          defaults={{
            roomTypeId: selRoom || rooms[0]?.id,
            from: selDate || from,
            to: selDate || from,
            price: selected?.priceCents != null ? String(selected.priceCents / 100) : "",
            blockedUnits: selected?.blockedUnits ?? 0,
            closed: selected?.closed ?? false,
          }}
        />
      </section>
    </div>
  );
}
