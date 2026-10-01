import Link from "next/link";
import { notFound } from "next/navigation";
import { count, eq } from "drizzle-orm";
import { db, bookings, roomTypes } from "@/db";
import { fill, plural } from "@/i18n/config";
import { DeleteRoomType } from "@/components/admin/delete-room-type";
import { getAdminI18n, requireAdmin } from "@/lib/admin";
import { listPhotos } from "@/lib/photos";
import { RoomForm } from "@/components/admin/room-form";
import { getDictionary } from "@/i18n";

export async function generateMetadata() {
  const { t } = await getAdminI18n();
  return { title: t.room.title };
}
export const dynamic = "force-dynamic";

export default async function EditRoom({ params, searchParams }: PageProps<"/admin/rooms/[id]">) {
  await requireAdmin();
  const { lang, t } = await getAdminI18n();
  const { id } = await params;
  const [room] = await db
    .select()
    .from(roomTypes)
    .where(eq(roomTypes.id, Number(id)))
    .limit(1);
  if (!room) notFound();
  const created = (await searchParams).created === "1";
  const [{ n: bookingCount }] = await db.select({ n: count() }).from(bookings).where(eq(bookings.roomTypeId, room.id));

  const photos = await listPhotos();
  // Keep photos already on the room even if the file list can't be read.
  const missing = room.images.filter((src) => !photos.some((p) => p.src === src));
  const available = [...photos, ...missing.map((src) => ({ src, name: src.split("/").pop() ?? src, uploaded: false }))];
  const amenities = Object.entries(getDictionary(lang).amenities).map(([key, label]) => ({ key, label }));

  return (
    <div className="max-w-5xl">
      <Link href="/admin/rooms" className="link text-sm">
        ← {t.room.back}
      </Link>
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-4xl">{room.name[lang]}</h1>
        <Link href={`/${lang}/rooms/${room.slug}`} target="_blank" className="link text-sm">
          {t.room.viewOnSite}
        </Link>
      </div>
      {created && (
        <p role="status" className="mt-4 rounded-[var(--radius-soft)] border border-ok/30 bg-ok/10 px-4 py-3 font-semibold text-ok">
          {t.room.created}
        </p>
      )}
      <RoomForm
        key={room.id}
        photos={available}
        amenities={amenities}
        room={{
          id: room.id,
          name: room.name,
          summary: room.summary,
          description: room.description,
          bed: room.bed,
          sizeM2: room.sizeM2,
          maxAdults: room.maxAdults,
          maxChildren: room.maxChildren,
          basePrice: room.basePriceCents / 100,
          inventory: room.inventory,
          images: room.images,
          amenities: room.amenities,
          active: room.active,
        }}
      />

      <section className="mt-12 max-w-2xl rounded-[var(--radius-soft)] border border-danger/30 p-5">
        <h2 className="font-sans text-lg font-semibold">{t.room.deleteTitle}</h2>
        {bookingCount > 0 ? (
          <p className="mt-1 text-sm text-muted">{fill(t.room.deleteBlocked, { n: plural(lang, t.room.bookings, bookingCount) })}</p>
        ) : (
          <>
            <p className="mt-1 mb-4 text-sm text-muted">{t.room.deleteLead}</p>
            <DeleteRoomType id={room.id} />
          </>
        )}
      </section>
    </div>
  );
}
