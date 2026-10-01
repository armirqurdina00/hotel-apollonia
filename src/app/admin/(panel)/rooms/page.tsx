import Image from "next/image";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, roomTypes } from "@/db";
import { getAdminI18n, requireAdmin } from "@/lib/admin";
import { fill, plural } from "@/i18n/config";
import { PRICING } from "@/lib/hotel";
import { updateRoomType } from "../../actions";

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
      <h1 className="text-4xl">{t.rooms.title}</h1>
      <p className="mt-2 text-muted max-w-2xl">
        {fill(t.rooms.lead, { pct: Math.round((PRICING.weekendMultiplier - 1) * 100) })}{" "}
        <Link href="/admin/calendar" className="link">
          {t.nav.calendar}
        </Link>
        .
      </p>
      <ul className="mt-8 space-y-3">
        {rooms.map((r) => (
          <li key={r.id} className="rounded-[var(--radius-soft)] border border-line bg-mist p-4">
            <form action={updateRoomType} className="grid items-end gap-4 sm:grid-cols-[4rem_1fr_8rem_7rem_auto_auto_auto]">
              <input type="hidden" name="id" value={r.id} />
              <div className="relative hidden sm:block size-16 overflow-hidden rounded-[4px]">
                <Image src={r.images[0]} alt="" fill sizes="64px" className="object-cover" />
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
      <p className="mt-6 text-sm text-muted">{t.rooms.footer}</p>
    </div>
  );
}
