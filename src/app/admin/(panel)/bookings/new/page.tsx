import { asc } from "drizzle-orm";
import { db, roomTypes } from "@/db";
import { getAdminI18n, requireAdmin } from "@/lib/admin";
import { addDays, todayInGjakova } from "@/lib/dates";
import { ManualBookingForm } from "@/components/admin/manual-booking-form";

export async function generateMetadata() {
  const { t } = await getAdminI18n();
  return { title: t.newBooking.title };
}
export const dynamic = "force-dynamic";

export default async function NewBooking() {
  await requireAdmin();
  const { lang, t } = await getAdminI18n();
  const rooms = await db.select({ id: roomTypes.id, name: roomTypes.name, active: roomTypes.active }).from(roomTypes).orderBy(asc(roomTypes.sortOrder));
  const today = todayInGjakova();
  return (
    <div className="max-w-3xl">
      <h1 className="text-4xl">{t.newBooking.title}</h1>
      <p className="mt-2 text-muted">{t.newBooking.lead}</p>
      <ManualBookingForm rooms={rooms.filter((r) => r.active).map((r) => ({ id: r.id, name: r.name[lang] }))} today={today} tomorrow={addDays(today, 1)} />
    </div>
  );
}
