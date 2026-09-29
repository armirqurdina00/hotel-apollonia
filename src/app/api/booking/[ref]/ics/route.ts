import { eq } from "drizzle-orm";
import { db, bookings, roomTypes } from "@/db";
import { verifyBookingToken } from "@/lib/auth";
import { HOTEL } from "@/lib/hotel";
import { isLocale } from "@/i18n/config";

const icsDate = (d: string) => d.replaceAll("-", "");
const escape = (s: string) => s.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

export async function GET(req: Request, ctx: RouteContext<"/api/booking/[ref]/ics">) {
  const { ref } = await ctx.params;
  const token = new URL(req.url).searchParams.get("t");
  if (!verifyBookingToken(ref, token)) return new Response("Not found", { status: 404 });

  const [row] = await db
    .select({ b: bookings, room: roomTypes })
    .from(bookings)
    .innerJoin(roomTypes, eq(bookings.roomTypeId, roomTypes.id))
    .where(eq(bookings.ref, ref))
    .limit(1);
  if (!row) return new Response("Not found", { status: 404 });
  const { b, room } = row;
  const lang = isLocale(b.locale) ? b.locale : "en";

  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Hotel Apollonia//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${b.ref}@hotelapollonia`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${icsDate(b.checkIn)}`,
    `DTEND;VALUE=DATE:${icsDate(b.checkOut)}`,
    `SUMMARY:${escape(`${HOTEL.name}: ${room.name[lang]} (${b.ref})`)}`,
    `LOCATION:${escape(`${HOTEL.name}, ${HOTEL.street}, ${HOTEL.postalCode} ${HOTEL.city}, ${HOTEL.country}`)}`,
    `DESCRIPTION:${escape(`${b.ref}\nCheck-in ${HOTEL.checkInFrom}, check-out ${HOTEL.checkOutUntil}\n${HOTEL.phone}`)}`,
    `GEO:${HOTEL.geo.lat};${HOTEL.geo.lng}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${b.ref}.ics"`,
    },
  });
}
