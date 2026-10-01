import Image from "next/image";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, roomTypes } from "@/db";
import { getAdminI18n, requireAdmin } from "@/lib/admin";
import { fill, plural } from "@/i18n/config";
import { PRICING } from "@/lib/hotel";
import { moveRoomType, updateRoomType } from "../../actions";

export async function generateMetadata() {
  const { t } = await getAdminI18n();
  return { title: t.rooms.title };
}
export const dynamic = "force-dynamic";

export default async function RoomsAdmin() {
  await requireAdmin();
  const { lang, t } = await getAdminI18n();
  const rooms = await db.select().from(roomTypes).orderBy(asc(roomTypes.sortOrder));
  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl">{t.rooms.title}</h1>
        <Link href="/admin/rooms/new" className="btn btn-primary">
          {t.rooms.add}
        </Link>
      </div>
      <p className="mt-2 text-muted max-w-2xl">
        {fill(t.rooms.lead, { pct: Math.round((PRICING.weekendMultiplier - 1) * 100) })}{" "}
        <Link href="/admin/calendar" className="link">
          {t.nav.calendar}
        </Link>
        .
      </p>
      <ul className="mt-8 space-y-3">
        {rooms.map((r, n) => (
          <li key={r.id} className="flex items-stretch gap-3 rounded-[var(--radius-soft)] border border-line bg-mist p-4">
            {/* Order on the website; a form per arrow because the row's own form saves price and stock. */}
            <div className="flex shrink-0 flex-col justify-center gap-1">
              {(["up", "down"] as const).map((dir) => (
                <form key={dir} action={moveRoomType}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="dir" value={dir} />
                  <button
                    aria-label={dir === "up" ? t.rooms.moveUp : t.rooms.moveDown}
                    title={dir === "up" ? t.rooms.moveUp : t.rooms.moveDown}
                    disabled={dir === "up" ? n === 0 : n === rooms.length - 1}
                    className="grid size-8 place-items-center rounded-[4px] text-forest hover:bg-white disabled:text-black/20 disabled:hover:bg-transparent"
                  >
                    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2]">
                      <path d={dir === "up" ? "M3.5 10 8 5.5l4.5 4.5" : "M3.5 6 8 10.5 12.5 6"} />
                    </svg>
                  </button>
                </form>
              ))}
            </div>
            <form action={updateRoomType} className="grid min-w-0 flex-1 items-end gap-4 sm:grid-cols-[4rem_1fr_8rem_7rem_auto_auto_auto]">
              <input type="hidden" name="id" value={r.id} />
              <div className="relative hidden sm:block size-16 overflow-hidden rounded-[4px]">
                {r.images[0] && <Image src={r.images[0]} alt="" fill sizes="64px" className="object-cover" />}
              </div>
              <div>
                <p className="font-semibold">{r.name[lang]}</p>
                <p className="text-sm text-muted">
                  {fill(t.rooms.summary, { size: r.sizeM2, adults: plural(lang, t.adults, r.maxAdults) })}
                  {r.maxChildren > 0 && fill(t.rooms.plusChildren, { children: plural(lang, t.children, r.maxChildren) })}
                </p>
              </div>
              <div>
                <label className="field-label" htmlFor={`p-${r.id}`}>
                  {t.rooms.basePrice}
                </label>
                <input id={`p-${r.id}`} name="basePrice" inputMode="decimal" defaultValue={r.basePriceCents / 100} className="field" />
              </div>
              <div>
                <label className="field-label" htmlFor={`i-${r.id}`}>
                  {t.rooms.rooms}
                </label>
                <input id={`i-${r.id}`} name="inventory" type="number" min={0} defaultValue={r.inventory} className="field" />
              </div>
              <label className="flex items-center gap-2 min-h-12">
                <input type="checkbox" name="active" defaultChecked={r.active} className="size-4" /> {t.rooms.onSale}
              </label>
              <button className="btn btn-ghost">{t.save}</button>
              <Link href={`/admin/rooms/${r.id}`} className="btn btn-primary">
                {t.rooms.edit}
              </Link>
            </form>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-muted">
        {t.rooms.footer} {t.rooms.orderHint}
      </p>
    </div>
  );
}
