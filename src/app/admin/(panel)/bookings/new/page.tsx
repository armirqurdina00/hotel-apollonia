import { asc } from "drizzle-orm";
import { db, roomTypes } from "@/db";
import { requireAdmin } from "@/lib/admin";
import { addDays, todayInGjakova } from "@/lib/dates";
import { ManualBookingForm } from "@/components/admin/manual-booking-form";

export const metadata = { title: "Add booking" };
export const dynamic = "force-dynamic";

export default async function NewBooking() {
  await requireAdmin();
  const rooms = await db.select({ id: roomTypes.id, name: roomTypes.name, active: roomTypes.active }).from(roomTypes).orderBy(asc(roomTypes.sortOrder));
  const today = todayInGjakova();
  return (
    <div className="max-w-3xl">
      <h1 className="text-4xl">Add booking</h1>
      <p className="mt-2 text-muted">For phone calls, walk-ins and bookings from other websites. Availability is checked the same way as online.</p>
      <ManualBookingForm rooms={rooms.filter((r) => r.active).map((r) => ({ id: r.id, name: r.name.en }))} today={today} tomorrow={addDays(today, 1)} />
    </div>
  );
}
