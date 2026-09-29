import { NextResponse, type NextRequest } from "next/server";
import { roomBySlug, nightlyGrid } from "@/lib/engine";
import { addMonths, isISODate, monthStart, todayInGjakova } from "@/lib/dates";

/** GET /api/rates?room=double&month=2026-10-01&months=2 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const room = await roomBySlug(sp.get("room") ?? "");
  if (!room) return NextResponse.json({ error: "room_not_found" }, { status: 404 });

  const today = todayInGjakova();
  const requested = sp.get("month");
  const from = monthStart(isISODate(requested) ? requested : today);
  const months = Math.min(3, Math.max(1, Number(sp.get("months")) || 2));
  const to = addMonths(from, months);

  const grid = await nightlyGrid([room], from, to);
  return NextResponse.json(
    {
      room: room.slug,
      today,
      from,
      to,
      days: grid.get(room.id)!.map((n) => ({ d: n.date, p: n.priceCents, a: n.available, c: n.closed })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
