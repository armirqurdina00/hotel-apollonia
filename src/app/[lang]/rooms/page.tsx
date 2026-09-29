import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "@/i18n";
import { activeRooms, fromPrices } from "@/lib/engine";
import { todayInGjakova } from "@/lib/dates";
import { RoomRow } from "@/components/room-row";
import { SearchPanel } from "@/components/search-panel";
import { searchLabels } from "@/components/search-labels";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[lang]/rooms">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getDictionary(lang);
  return { title: t.rooms.title, description: t.rooms.lead, alternates: { canonical: `/${lang}/rooms` } };
}

export default async function RoomsPage({ params }: PageProps<"/[lang]/rooms">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const rooms = await activeRooms();
  const from = await fromPrices(rooms);

  return (
    <>
      <div className="crest">
        <div className="wrap py-10">
          <h1 className="text-4xl sm:text-5xl mb-2">{t.rooms.title}</h1>
          <p className="text-white/75 mb-8 prose-measure">{t.rooms.lead}</p>
          <SearchPanel lang={lang} labels={searchLabels(t)} today={todayInGjakova()} layout="bar" />
        </div>
      </div>
      <div className="wrap pt-6">
        {rooms.map((r, i) => (
          <RoomRow key={r.id} room={r} lang={lang} t={t} fromCents={from.get(r.id)!} priority={i === 0} />
        ))}
      </div>
    </>
  );
}
