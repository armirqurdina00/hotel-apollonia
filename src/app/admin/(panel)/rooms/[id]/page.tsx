import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, roomTypes } from "@/db";
import { getAdminI18n, requireAdmin } from "@/lib/admin";
import { listPhotos } from "@/lib/photos";
import { RoomForm } from "@/components/admin/room-form";
import { getDictionary } from "@/i18n";

export async function generateMetadata() {
  const { t } = await getAdminI18n();
  return { title: t.room.title };
}
export const dynamic = "force-dynamic";

export default async function EditRoom({ params }: PageProps<"/admin/rooms/[id]">) {
  await requireAdmin();
  const { lang, t } = await getAdminI18n();
  const { id } = await params;
  const [room] = await db
    .select()
    .from(roomTypes)
    .where(eq(roomTypes.id, Number(id)))
    .limit(1);
  if (!room) notFound();

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
    </div>
  );
}
