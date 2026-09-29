/**
 * Creates the schema's starting data: room types (placeholders until the
 * owners confirm real rooms, sizes and prices) and a few demo bookings so the
 * admin calendar isn't empty.
 *
 *   npm run db:seed            insert rooms if the table is empty
 *   npm run db:seed -- --demo  also add demo bookings
 */
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { roomTypes, bookings } from "../src/db/schema";

const client = createClient({
  url: process.env.DATABASE_URL ?? "file:./data/apollonia.db",
  authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
});
const db = drizzle(client);

const common = ["wifi", "ac", "tv", "shower", "toiletries", "desk", "breakfast", "parking"];

const ROOMS: (typeof roomTypes.$inferInsert)[] = [
  {
    slug: "single",
    sortOrder: 1,
    name: { sq: "Dhomë teke", en: "Single room", de: "Einzelzimmer" },
    summary: {
      sq: "Për udhëtarin që vjen për punë dhe do gjumë të qetë.",
      en: "For the business traveller who wants a quiet night.",
      de: "Für Geschäftsreisende, die ruhig schlafen wollen.",
    },
    description: {
      sq: "Dhomë kompakte me shtrat francez, tavolinë pune dhe banjo private me dush. Wi-Fi i shpejtë dhe mëngjesi përfshihen në çmim.",
      en: "A compact room with a small double bed, a proper work desk and a private shower room. Fast Wi-Fi and breakfast are included.",
      de: "Kompaktes Zimmer mit französischem Bett, Schreibtisch und eigenem Duschbad. Schnelles WLAN und Frühstück sind inklusive.",
    },
    bed: { sq: "1 shtrat francez", en: "1 small double bed", de: "1 französisches Bett" },
    sizeM2: 16,
    maxAdults: 1,
    maxChildren: 0,
    inventory: 4,
    basePriceCents: 3500,
    images: ["/photos/room-single.jpg", "/photos/bathroom.jpg"],
    amenities: common,
  },
  {
    slug: "double",
    sortOrder: 2,
    name: { sq: "Dhomë dyshe", en: "Double room", de: "Doppelzimmer" },
    summary: {
      sq: "Dhoma jonë më e kërkuar, për çifte dhe vizita familjare.",
      en: "Our most booked room, for couples and family visits.",
      de: "Unser meistgebuchtes Zimmer, für Paare und Familienbesuche.",
    },
    description: {
      sq: "Shtrat bashkëshortor, kondicioner, televizor me ekran të sheshtë dhe banjo private. Mëngjesi në restorant çdo mëngjes nga ora 07:00.",
      en: "A double bed, air conditioning, a flat-screen TV and a private bathroom. Breakfast is served in the restaurant from 07:00.",
      de: "Doppelbett, Klimaanlage, Flachbild-TV und eigenes Bad. Frühstück gibt es im Restaurant ab 07:00 Uhr.",
    },
    bed: { sq: "1 shtrat bashkëshortor", en: "1 double bed", de: "1 Doppelbett" },
    sizeM2: 20,
    maxAdults: 2,
    maxChildren: 1,
    inventory: 10,
    basePriceCents: 4500,
    images: ["/photos/room-double.jpg", "/photos/room-double-2.jpg", "/photos/bathroom-2.jpg"],
    amenities: common,
  },
  {
    slug: "twin",
    sortOrder: 3,
    name: { sq: "Dhomë me dy shtretër", en: "Twin room", de: "Zweibettzimmer" },
    summary: {
      sq: "Dy shtretër të veçantë, për kolegë ose miq.",
      en: "Two separate beds, for colleagues or friends.",
      de: "Zwei getrennte Betten, für Kollegen oder Freunde.",
    },
    description: {
      sq: "Dy shtretër teke, hapësirë për bagazhe dhe banjo private me dush. E preferuar nga grupet që vijnë për konferenca.",
      en: "Two single beds, room for luggage and a private shower room. Popular with teams attending events in the conference room.",
      de: "Zwei Einzelbetten, Platz für Gepäck und eigenes Duschbad. Beliebt bei Teams, die zu Veranstaltungen im Konferenzraum kommen.",
    },
    bed: { sq: "2 shtretër teke", en: "2 single beds", de: "2 Einzelbetten" },
    sizeM2: 20,
    maxAdults: 2,
    maxChildren: 0,
    inventory: 6,
    basePriceCents: 4500,
    images: ["/photos/room-twin.jpg", "/photos/room-twin-2.jpg", "/photos/bathroom.jpg"],
    amenities: common,
  },
  {
    slug: "superior",
    sortOrder: 4,
    name: { sq: "Dhomë superiore", en: "Superior double", de: "Superior-Doppelzimmer" },
    summary: {
      sq: "Më shumë hapësirë, kënd ndenjjeje dhe shtrat më i madh.",
      en: "More space, a sitting corner and a larger bed.",
      de: "Mehr Platz, eine Sitzecke und ein größeres Bett.",
    },
    description: {
      sq: "Shtrat king-size, kënd ndenjjeje dhe dritare të mëdha. Ka vend për një shtrat shtesë për fëmijë.",
      en: "A king-size bed, a sitting corner and large windows. There is space for an extra bed for a child.",
      de: "Kingsize-Bett, Sitzecke und große Fenster. Platz für ein Zustellbett für ein Kind.",
    },
    bed: { sq: "1 shtrat king-size", en: "1 king-size bed", de: "1 Kingsize-Bett" },
    sizeM2: 26,
    maxAdults: 2,
    maxChildren: 1,
    inventory: 4,
    basePriceCents: 6000,
    images: ["/photos/room-superior.jpg", "/photos/room-superior-2.jpg", "/photos/room-superior-3.jpg"],
    amenities: [...common, "minibar", "seating"],
  },
  {
    slug: "family",
    sortOrder: 5,
    name: { sq: "Dhomë familjare", en: "Family room", de: "Familienzimmer" },
    summary: {
      sq: "Për familjet që vijnë në Gjakovë për pushime ose dasma.",
      en: "For families home in Gjakova for the holidays or a wedding.",
      de: "Für Familien, die zu Urlaub oder Hochzeit nach Gjakova kommen.",
    },
    description: {
      sq: "Shtrat bashkëshortor dhe dy shtretër teke në një dhomë të gjerë, për deri në katër persona. Parkimi falas pranë hotelit.",
      en: "A double bed and two single beds in one generous room, for up to four people. Free parking right by the hotel.",
      de: "Doppelbett und zwei Einzelbetten in einem großzügigen Raum, für bis zu vier Personen. Kostenlose Parkplätze direkt am Hotel.",
    },
    bed: { sq: "1 bashkëshortor + 2 teke", en: "1 double + 2 single beds", de: "1 Doppel- + 2 Einzelbetten" },
    sizeM2: 32,
    maxAdults: 3,
    maxChildren: 2,
    inventory: 3,
    basePriceCents: 7500,
    images: ["/photos/room-family.jpg", "/photos/room-family-2.jpg", "/photos/bathroom-2.jpg"],
    amenities: [...common, "seating"],
  },
];

async function main() {
  const existing = await db.select({ id: roomTypes.id }).from(roomTypes);
  if (existing.length === 0) {
    await db.insert(roomTypes).values(ROOMS);
    console.log(`Inserted ${ROOMS.length} room types.`);
  } else {
    console.log(`Room types already present (${existing.length}); skipping.`);
  }

  if (process.argv.includes("--demo")) {
    const rooms = await db.select().from(roomTypes);
    const bySlug = Object.fromEntries(rooms.map((r) => [r.slug, r]));
    const today = new Date();
    const d = (n: number) => new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + n)).toISOString().slice(0, 10);
    const demo = [
      ["double", -1, 2, "Arta", "Krasniqi", "confirmed"],
      ["double", 0, 3, "Lukas", "Weber", "confirmed"],
      ["twin", 0, 1, "Besnik", "Hoxha", "pending"],
      ["family", 2, 7, "Drita", "Berisha", "confirmed"],
      ["superior", 5, 7, "Sophie", "Martin", "confirmed"],
      ["single", 1, 4, "Arben", "Gashi", "pending"],
    ] as const;
    for (const [i, [slug, start, nights, first, last, status]] of demo.entries()) {
      const room = bySlug[slug];
      const nightly = Array.from({ length: nights }, (_, k) => ({ date: d(start + k), cents: room.basePriceCents }));
      await db.insert(bookings).values({
        ref: `APL-DEMO${i + 1}`,
        roomTypeId: room.id,
        checkIn: d(start),
        checkOut: d(start + nights),
        nights,
        adults: 2 > room.maxAdults ? room.maxAdults : 2,
        firstName: first,
        lastName: last,
        email: `${first.toLowerCase()}@example.com`,
        phone: "+383 44 000 000",
        country: "XK",
        totalCents: room.basePriceCents * nights,
        nightly,
        status,
        source: i % 2 ? "phone" : "web",
      }).onConflictDoNothing();
    }
    console.log("Demo bookings added.");
  }
}

main().then(() => process.exit(0), (e) => {
  console.error(e);
  process.exit(1);
});
