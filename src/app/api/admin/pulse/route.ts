import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { and, desc, eq, gt } from "drizzle-orm";
import { db, bookings, inquiries, roomTypes } from "@/db";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/auth";
import { getAdminI18n, latestIds } from "@/lib/admin";

/**
 * GET /api/admin/pulse?b=<last booking id>&i=<last request id>
 * What arrived from the website since the admin panel last looked. Polled by
 * <LiveUpdates>, since Vercel functions can't hold a WebSocket open.
 */
export async function GET(req: NextRequest) {
  if (!(await verifyAdminSession((await cookies()).get(ADMIN_COOKIE)?.value))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { lang } = await getAdminI18n();
  const sp = req.nextUrl.searchParams;
  const sinceB = Math.max(0, Number(sp.get("b")) | 0);
  const sinceI = Math.max(0, Number(sp.get("i")) | 0);

  const [ids, newBookings, newInquiries] = await Promise.all([
    latestIds(),
    db
      .select({
        id: bookings.id,
        ref: bookings.ref,
        room: roomTypes.name,
        checkIn: bookings.checkIn,
        checkOut: bookings.checkOut,
        firstName: bookings.firstName,
        lastName: bookings.lastName,
      })
      .from(bookings)
      .innerJoin(roomTypes, eq(bookings.roomTypeId, roomTypes.id))
      // Staff-entered bookings (phone, walk-in) aren't news to the person who entered them.
      .where(and(gt(bookings.id, sinceB), eq(bookings.source, "web")))
      .orderBy(desc(bookings.id))
      .limit(10),
    db
      .select({ id: inquiries.id, kind: inquiries.kind, name: inquiries.name, date: inquiries.date, time: inquiries.time, people: inquiries.people })
      .from(inquiries)
      .where(gt(inquiries.id, sinceI))
      .orderBy(desc(inquiries.id))
      .limit(10),
  ]);

  return NextResponse.json(
    {
      ...ids,
      bookings: newBookings.map((b) => ({ id: b.id, ref: b.ref, room: b.room[lang], checkIn: b.checkIn, checkOut: b.checkOut, guest: `${b.firstName} ${b.lastName}` })),
      inquiries: newInquiries,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
