import Image from "next/image";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, roomTypes } from "@/db";
import { requireAdmin } from "@/lib/admin";
import { PRICING } from "@/lib/hotel";
import { updateRoomType } from "../../actions";

export const metadata = { title: "Room types" };
export const dynamic = "force-dynamic";

export default async function RoomsAdmin() {
  await requireAdmin();
  const rooms = await db.select().from(roomTypes).orderBy(asc(roomTypes.sortOrder));
  return (
    <div className="max-w-5xl">
      <h1 className="text-4xl">Room types</h1>
      <p className="mt-2 text-muted max-w-2xl">
        The base price is the weekday price with breakfast. Friday and Saturday nights cost {Math.round((PRICING.weekendMultiplier - 1) * 100)}% more, and
        seasonal prices apply automatically. To change a single date, use{" "}
        <Link href="/admin/calendar" className="link">
          Rates &amp; availability
        </Link>
        .
      </p>
      <ul className="mt-8 space-y-3">
        {rooms.map((r) => (
          <li key={r.id} className="rounded-[var(--radius-soft)] border border-line bg-mist p-4">
            <form action={updateRoomType} className="grid items-end gap-4 sm:grid-cols-[4rem_1fr_8rem_7rem_auto_auto]">
              <input type="hidden" name="id" value={r.id} />
              <div className="relative hidden sm:block size-16 overflow-hidden rounded-[4px]">
                <Image src={r.images[0]} alt="" fill sizes="64px" className="object-cover" />
              </div>
              <div>
                <p className="font-semibold">{r.name.en}</p>
                <p className="text-sm text-muted">
                  {r.sizeM2} m², up to {r.maxAdults} adults{r.maxChildren ? ` + ${r.maxChildren} child` : ""}
                </p>
              </div>
              <div>
                <label className="field-label" htmlFor={`p-${r.id}`}>
                  Base price (€)
                </label>
                <input id={`p-${r.id}`} name="basePrice" inputMode="decimal" defaultValue={r.basePriceCents / 100} className="field" />
              </div>
              <div>
                <label className="field-label" htmlFor={`i-${r.id}`}>
                  Rooms
                </label>
                <input id={`i-${r.id}`} name="inventory" type="number" min={0} defaultValue={r.inventory} className="field" />
              </div>
              <label className="flex items-center gap-2 min-h-12">
                <input type="checkbox" name="active" defaultChecked={r.active} className="size-4" /> On sale
              </label>
              <button className="btn btn-ghost">Save</button>
            </form>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-muted">
        Room names, descriptions and photos are in <code>scripts/seed.ts</code> for now. Run <code>npm run db:studio</code> to edit them directly.
      </p>
    </div>
  );
}
