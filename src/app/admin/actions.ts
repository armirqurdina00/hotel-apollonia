"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { db, bookings, dayOverrides, inquiries, roomTypes, BOOKING_STATUSES } from "@/db";
import { ADMIN_COOKIE, adminCookieOptions, checkAdminPassword, createAdminSession } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";
import { createBooking, SoldOutError, validateStay } from "@/lib/engine";
import { sendBookingEmails, sendCancellationEmail } from "@/lib/email";
import { addDays, isISODate, nightsBetween } from "@/lib/dates";

export type AdminState = { error?: string; ok?: string };

const now = () => new Date().toISOString().replace("T", " ").slice(0, 19);

// Slows password guessing without extra infrastructure.
const failures = new Map<string, { n: number; until: number }>();

export async function loginAction(_: AdminState, form: FormData): Promise<AdminState> {
  const key = "global";
  const f = failures.get(key);
  if (f && f.until > Date.now()) return { error: "Too many attempts. Wait a minute and try again." };

  if (!checkAdminPassword(String(form.get("password") ?? ""))) {
    const n = (f?.n ?? 0) + 1;
    failures.set(key, { n, until: n >= 5 ? Date.now() + 60_000 : 0 });
    return { error: "That password isn't right." };
  }
  failures.delete(key);
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, await createAdminSession(), adminCookieOptions);
  const next = String(form.get("next") ?? "");
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logoutAction() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

export async function setBookingStatus(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  const status = z.enum(BOOKING_STATUSES).parse(form.get("status"));
  const [before] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  if (!before) return;

  // Re-opening a cancelled booking must not overbook the room.
  if (before.status === "cancelled" && ["pending", "confirmed", "checked_in"].includes(status)) {
    const { nightlyGrid } = await import("@/lib/engine");
    const [room] = await db.select().from(roomTypes).where(eq(roomTypes.id, before.roomTypeId));
    const grid = await nightlyGrid([room], before.checkIn, before.checkOut);
    if (grid.get(room.id)!.some((n) => n.available < before.rooms)) {
      redirect(`/admin/bookings/${id}?error=full`);
    }
  }

  const [after] = await db.update(bookings).set({ status, updatedAt: now() }).where(eq(bookings.id, id)).returning();
  if (status === "cancelled" && before.status !== "cancelled" && form.get("notify") === "on") {
    const [room] = await db.select().from(roomTypes).where(eq(roomTypes.id, after.roomTypeId));
    await sendCancellationEmail(after, room);
  }
  revalidatePath("/admin", "layout");
}

export async function saveInternalNote(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  const note = String(form.get("internalNote") ?? "").slice(0, 2000);
  await db.update(bookings).set({ internalNote: note || null, updatedAt: now() }).where(eq(bookings.id, id));
  revalidatePath(`/admin/bookings/${id}`);
}

export async function createManualBooking(_: AdminState, form: FormData): Promise<AdminState> {
  await requireAdmin();
  const v = Object.fromEntries([...form.entries()].map(([k, x]) => [k, String(x)]));
  const stay = validateStay(v);
  if (!stay.ok) return { error: `Check the dates and guests (${stay.error}).` };
  if (!v.firstName || !v.lastName || !v.phone) return { error: "First name, last name and phone are required." };

  try {
    const { booking, room } = await createBooking({
      roomTypeId: Number(v.roomTypeId),
      stay: stay.value,
      locale: ["sq", "en", "de"].includes(v.locale) ? v.locale : "sq",
      status: v.status === "pending" ? "pending" : "confirmed",
      source: (["phone", "walk_in", "ota", "web"].includes(v.source) ? v.source : "phone") as "phone",
      internalNote: v.internalNote || null,
      guest: {
        firstName: v.firstName.trim(),
        lastName: v.lastName.trim(),
        email: (v.email || "").trim().toLowerCase(),
        phone: v.phone.trim(),
        country: v.country || null,
        notes: v.notes || null,
        parking: v.parking === "on",
      },
    });
    if (booking.email && v.sendEmail === "on") await sendBookingEmails(booking, room);
    revalidatePath("/admin", "layout");
    redirect(`/admin/bookings/${booking.id}`);
  } catch (e) {
    if (e instanceof SoldOutError) return { error: "No room of that type is free for every night of this stay, or the party is too large for it." };
    throw e;
  }
}

export async function saveOverrides(_: AdminState, form: FormData): Promise<AdminState> {
  await requireAdmin();
  const roomTypeId = Number(form.get("roomTypeId"));
  const from = String(form.get("from"));
  const to = String(form.get("to"));
  const mode = String(form.get("mode"));
  if (!isISODate(from) || !isISODate(to) || to < from) return { error: "Choose a valid date range." };
  // Inclusive of both ends: each date is a night that can be sold.
  const dates = nightsBetween(from, addDays(to, 1));
  if (dates.length > 366) return { error: "Choose at most one year at a time." };

  const rooms = roomTypeId ? [roomTypeId] : (await db.select({ id: roomTypes.id }).from(roomTypes)).map((r) => r.id);

  if (mode === "reset") {
    for (const id of rooms) {
      await db.delete(dayOverrides).where(and(eq(dayOverrides.roomTypeId, id), gte(dayOverrides.date, from), lte(dayOverrides.date, to)));
    }
    revalidatePath("/admin/calendar");
    return { ok: `Automatic prices and full availability restored for ${dates.length} day(s).` };
  }

  const priceRaw = String(form.get("price") ?? "").trim().replace(",", ".");
  const price = priceRaw === "" ? null : Math.round(Number(priceRaw) * 100);
  if (price !== null && (!Number.isFinite(price) || price < 0)) return { error: "Enter the price in euros, like 55." };
  const blocked = Math.max(0, Number(form.get("blockedUnits") || 0) | 0);
  const closed = form.get("closed") === "on";

  for (const id of rooms) {
    for (const date of dates) {
      await db
        .insert(dayOverrides)
        .values({ roomTypeId: id, date, priceCents: price, blockedUnits: blocked, closed })
        .onConflictDoUpdate({ target: [dayOverrides.roomTypeId, dayOverrides.date], set: { priceCents: price, blockedUnits: blocked, closed } });
    }
  }
  revalidatePath("/admin/calendar");
  return { ok: `Saved ${dates.length} day(s) for ${rooms.length} room type(s).` };
}

export async function updateRoomType(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  const price = Math.round(Number(String(form.get("basePrice")).replace(",", ".")) * 100);
  const inventory = Number(form.get("inventory")) | 0;
  if (!Number.isFinite(price) || price <= 0 || inventory < 0) return;
  await db
    .update(roomTypes)
    .set({ basePriceCents: price, inventory, active: form.get("active") === "on" })
    .where(eq(roomTypes.id, id));
  revalidatePath("/admin/rooms");
}

export async function setInquiryStatus(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  const status = form.get("status") === "handled" ? "handled" : "new";
  await db.update(inquiries).set({ status }).where(eq(inquiries.id, id));
  revalidatePath("/admin", "layout");
}
