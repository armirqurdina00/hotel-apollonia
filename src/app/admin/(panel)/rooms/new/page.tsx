import Link from "next/link";
import { getAdminI18n, requireAdmin } from "@/lib/admin";
import { listPhotos } from "@/lib/photos";
import { RoomForm } from "@/components/admin/room-form";
import { getDictionary } from "@/i18n";

export async function generateMetadata() {
  const { t } = await getAdminI18n();
  return { title: t.room.newTitle };
}
export const dynamic = "force-dynamic";

const empty = { sq: "", en: "", de: "" };

export default async function NewRoom() {
  await requireAdmin();
  const { lang, t } = await getAdminI18n();
  const photos = await listPhotos();
  const amenities = Object.entries(getDictionary(lang).amenities).map(([key, label]) => ({ key, label }));

  return (
    <div className="max-w-5xl">
      <Link href="/admin/rooms" className="link text-sm">
        ← {t.room.back}
      </Link>
      <h1 className="mt-3 text-4xl">{t.room.newTitle}</h1>
      <p className="mt-2 max-w-2xl text-muted">{t.room.newLead}</p>
      <RoomForm
        photos={photos}
        amenities={amenities}
        room={{
          id: 0,
          name: empty,
          summary: empty,
          description: empty,
          bed: empty,
          sizeM2: 20,
          maxAdults: 2,
          maxChildren: 0,
          basePrice: 50,
          inventory: 1,
          images: [],
          // Most rooms have the basics; staff untick what's missing.
          amenities: ["wifi", "ac", "tv", "shower", "toiletries", "breakfast", "parking"],
          active: true,
        }}
      />
    </div>
  );
}
