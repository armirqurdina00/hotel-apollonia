"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, asc, count, eq, gte, lte, max } from "drizzle-orm";
import { z } from "zod";
import { db, bookings, dayOverrides, inquiries, media, roomTypes, siteSettings, BOOKING_STATUSES } from "@/db";
import { IMAGE_SLOTS, type Contact, type SiteImages } from "@/lib/settings";
import { ADMIN_COOKIE, adminCookieOptions, checkAdminPassword, createAdminSession } from "@/lib/auth";
import { getAdminI18n, requireAdmin } from "@/lib/admin";
import { ADMIN_LANG_COOKIE, isAdminLang } from "@/i18n/admin";
import { fill, plural } from "@/i18n/config";
import { createBooking, SoldOutError, validateStay } from "@/lib/engine";
import { sendBookingConfirmedEmail, sendBookingEmails, sendCancellationEmail } from "@/lib/email";
import { addDays, isISODate, nightsBetween } from "@/lib/dates";
import { translate, TranslateError } from "@/lib/translate";

export type AdminState = { error?: string; ok?: string };

const now = () => new Date().toISOString().replace("T", " ").slice(0, 19);

// Slows password guessing without extra infrastructure.
const failures = new Map<string, { n: number; until: number }>();

export async function loginAction(_: AdminState, form: FormData): Promise<AdminState> {
  const key = "global";
  const f = failures.get(key);
  const { t } = await getAdminI18n();
  if (f && f.until > Date.now()) return { error: t.login.tooMany };

  if (!checkAdminPassword(String(form.get("password") ?? ""))) {
    const n = (f?.n ?? 0) + 1;
    failures.set(key, { n, until: n >= 5 ? Date.now() + 60_000 : 0 });
    return { error: t.login.wrong };
  }
  failures.delete(key);
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, await createAdminSession(), adminCookieOptions);
  const next = String(form.get("next") ?? "");
  redirect(next.startsWith("/admin") ? next : "/admin");
}

/** Switches the staff panel between Albanian and English for this browser. */
export async function setAdminLang(form: FormData) {
  const lang = form.get("lang");
  if (!isAdminLang(lang)) return;
  (await cookies()).set(ADMIN_LANG_COOKIE, lang, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/admin", "layout");
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
  const guestNews = (status === "cancelled" && form.get("notify") === "on") || (status === "confirmed" && before.status === "pending");
  if (guestNews && after.email) {
    const [room] = await db.select().from(roomTypes).where(eq(roomTypes.id, after.roomTypeId));
    if (status === "cancelled") await sendCancellationEmail(after, room, "hotel");
    else await sendBookingConfirmedEmail(after, room);
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
  const { t } = await getAdminI18n();
  const v = Object.fromEntries([...form.entries()].map(([k, x]) => [k, String(x)]));
  const stay = validateStay(v);
  if (!stay.ok) return { error: t.newBooking.errStay };
  if (!v.firstName || !v.lastName || !v.phone) return { error: t.newBooking.errRequired };

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
    if (e instanceof SoldOutError) return { error: t.newBooking.errSoldOut };
    throw e;
  }
}

export async function saveOverrides(_: AdminState, form: FormData): Promise<AdminState> {
  await requireAdmin();
  const { lang, t } = await getAdminI18n();
  const o = t.overrides;
  const roomTypeId = Number(form.get("roomTypeId"));
  const from = String(form.get("from"));
  const to = String(form.get("to"));
  const mode = String(form.get("mode"));
  if (!isISODate(from) || !isISODate(to) || to < from) return { error: o.errRange };
  // Inclusive of both ends: each date is a night that can be sold.
  const dates = nightsBetween(from, addDays(to, 1));
  if (dates.length > 366) return { error: o.errYear };

  const rooms = roomTypeId ? [roomTypeId] : (await db.select({ id: roomTypes.id }).from(roomTypes)).map((r) => r.id);

  if (mode === "reset") {
    for (const id of rooms) {
      await db.delete(dayOverrides).where(and(eq(dayOverrides.roomTypeId, id), gte(dayOverrides.date, from), lte(dayOverrides.date, to)));
    }
    revalidatePath("/admin/calendar");
    return { ok: fill(o.resetDone, { days: plural(lang, o.days, dates.length) }) };
  }

  const priceRaw = String(form.get("price") ?? "").trim().replace(",", ".");
  const price = priceRaw === "" ? null : Math.round(Number(priceRaw) * 100);
  if (price !== null && (!Number.isFinite(price) || price < 0)) return { error: o.errPrice };
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
  return { ok: fill(o.saved, { days: plural(lang, o.days, dates.length), rooms: plural(lang, o.roomTypes, rooms.length) }) };
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

const localized = (required: boolean) =>
  z.object({
    sq: required ? z.string().trim().min(1) : z.string().trim(),
    en: required ? z.string().trim().min(1) : z.string().trim(),
    de: required ? z.string().trim().min(1) : z.string().trim(),
  });

const roomDetails = z.object({
  name: localized(true),
  summary: localized(false),
  description: localized(false),
  bed: localized(false),
  sizeM2: z.coerce.number().int().min(1).max(500),
  maxAdults: z.coerce.number().int().min(1).max(20),
  maxChildren: z.coerce.number().int().min(0).max(20),
  basePriceCents: z.number().int().positive(),
  inventory: z.coerce.number().int().min(0).max(500),
  images: z.array(z.string().regex(/^\/(photos\/[\w.-]+|media\/\d+)$/)).min(1),
  amenities: z.array(z.string().regex(/^[a-z_]+$/)),
  active: z.boolean(),
});

export async function saveRoomDetails(_: AdminState, form: FormData): Promise<AdminState> {
  await requireAdmin();
  const { t } = await getAdminI18n();
  // No id means a new room type.
  const id = Number(form.get("id")) || 0;
  const text = (field: string) => ({
    sq: String(form.get(`${field}.sq`) ?? ""),
    en: String(form.get(`${field}.en`) ?? ""),
    de: String(form.get(`${field}.de`) ?? ""),
  });
  const parsed = roomDetails.safeParse({
    name: text("name"),
    summary: text("summary"),
    description: text("description"),
    bed: text("bed"),
    sizeM2: form.get("sizeM2"),
    maxAdults: form.get("maxAdults"),
    maxChildren: form.get("maxChildren"),
    basePriceCents: Math.round(Number(String(form.get("basePrice")).replace(",", ".")) * 100),
    inventory: form.get("inventory"),
    images: form.getAll("images").map(String),
    amenities: form.getAll("amenities").map(String),
    active: form.get("active") === "on",
  });
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "");
    const messages: Record<string, string> = {
      name: t.room.errName,
      images: t.room.errImages,
      basePriceCents: t.room.errPrice,
      sizeM2: t.room.errSize,
      maxAdults: t.room.errAdults,
    };
    return { error: messages[field] ?? t.room.errInvalid };
  }
  if (!id) {
    const [{ last }] = await db.select({ last: max(roomTypes.sortOrder) }).from(roomTypes);
    const [created] = await db
      .insert(roomTypes)
      .values({ ...parsed.data, slug: await uniqueRoomSlug(parsed.data.name.en || parsed.data.name.sq), sortOrder: (last ?? 0) + 1 })
      .returning({ id: roomTypes.id });
    revalidatePath("/admin", "layout");
    redirect(`/admin/rooms/${created.id}?created=1`);
  }
  const updated = await db.update(roomTypes).set(parsed.data).where(eq(roomTypes.id, id)).returning({ id: roomTypes.id });
  if (updated.length === 0) return { error: t.room.errGone };
  revalidatePath("/admin/rooms");
  revalidatePath(`/admin/rooms/${id}`);
  return { ok: t.room.saved };
}

export type RoomText = { name: string; bed: string; summary: string; description: string };
export type TranslateResult = { en?: RoomText; de?: RoomText; error?: string };

/** Machine-translates a room's Albanian text into English and German, for staff to review. */
export async function translateRoomText(sq: RoomText): Promise<TranslateResult> {
  await requireAdmin();
  const { t } = await getAdminI18n();
  const fields = ["name", "bed", "summary", "description"] as const;
  const text = Object.fromEntries(fields.map((f) => [f, String(sq[f] ?? "").slice(0, 4000)])) as RoomText;
  if (!text.name.trim() && !text.description.trim()) return { error: t.room.translateEmpty };
  try {
    const into = async (to: "en" | "de") => Object.fromEntries(await Promise.all(fields.map(async (f) => [f, await translate(text[f], "sq", to)]))) as RoomText;
    const [en, de] = await Promise.all([into("en"), into("de")]);
    return { en, de };
  } catch (e) {
    if (e instanceof TranslateError && e.reason === "quota") return { error: t.room.translateQuota };
    console.error("[translate]", e);
    return { error: t.room.translateFailed };
  }
}

/** The room page's address, from its name: "Family suite" → "family-suite", "-2" if taken. */
async function uniqueRoomSlug(name: string) {
  const base =
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "room";
  const taken = new Set((await db.select({ slug: roomTypes.slug }).from(roomTypes)).map((r) => r.slug));
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

/** Deletes a room type that has never been booked; booked ones can only be taken off sale. */
export async function deleteRoomType(id: number): Promise<AdminState> {
  await requireAdmin();
  const { lang, t } = await getAdminI18n();
  const [{ n }] = await db.select({ n: count() }).from(bookings).where(eq(bookings.roomTypeId, id));
  if (n > 0) return { error: fill(t.room.deleteBlocked, { n: plural(lang, t.room.bookings, n) }) };
  await db.delete(dayOverrides).where(eq(dayOverrides.roomTypeId, id));
  await db.delete(roomTypes).where(eq(roomTypes.id, id));
  revalidatePath("/admin", "layout");
  redirect("/admin/rooms");
}

/** Moves a room type one place up or down in the website's room list. */
export async function moveRoomType(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  const by = form.get("dir") === "up" ? -1 : 1;
  const order = (await db.select({ id: roomTypes.id }).from(roomTypes).orderBy(asc(roomTypes.sortOrder), asc(roomTypes.id))).map((r) => r.id);
  const i = order.indexOf(id);
  const j = i + by;
  if (i < 0 || j < 0 || j >= order.length) return;
  [order[i], order[j]] = [order[j], order[i]];
  // Rewrite every position so ties or gaps from older data can't confuse the order.
  for (const [n, roomId] of order.entries()) await db.update(roomTypes).set({ sortOrder: n + 1 }).where(eq(roomTypes.id, roomId));
  revalidatePath("/admin/rooms");
}

const CONTACT_FIELDS = ["phone", "barPhone", "whatsapp", "email", "street", "postalCode", "city", "country", "instagram", "facebook", "mapsQuery"] as const;
const PHOTO_PATH = /^\/(photos|images)\/[\w.-]+$|^\/media\/\d+$/;

/** Saves the website's contact details and homepage photos. */
export async function saveSiteSettings(_: AdminState, form: FormData): Promise<AdminState> {
  await requireAdmin();
  const { t } = await getAdminI18n();
  const e = t.settings;
  const contact = Object.fromEntries(CONTACT_FIELDS.map((f) => [f, String(form.get(f) ?? "").trim().slice(0, 300)])) as Contact;
  const images = Object.fromEntries(IMAGE_SLOTS.map((slot) => [slot, String(form.get(`image.${slot}`) ?? "")])) as SiteImages;

  const isPhone = (v: string) => /^\+?[\d\s()/-]{6,}$/.test(v);
  if (!isPhone(contact.phone) || !isPhone(contact.barPhone) || (contact.whatsapp && !isPhone(contact.whatsapp))) return { error: e.errPhone };
  if (contact.email && !z.email().safeParse(contact.email).success) return { error: e.errEmail };
  if ([contact.instagram, contact.facebook].some((u) => u && !/^https:\/\/\S+$/.test(u))) return { error: e.errUrl };
  if (!contact.street || !contact.city || !contact.mapsQuery) return { error: e.errRequired };
  if (!Object.values(images).every((src) => PHOTO_PATH.test(src))) return { error: e.errImages };

  for (const [key, value] of [["contact", contact], ["images", images]] as const) {
    await db
      .insert(siteSettings)
      .values({ key, value })
      .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: now() } });
  }
  // Every public page shows the footer's contact details.
  revalidatePath("/", "layout");
  return { ok: e.saved };
}

const MAX_UPLOAD = 3.5 * 1024 * 1024;

/** Checks the file's first bytes, so only real JPEG/WebP images are stored. */
function sniffImage(bytes: Uint8Array) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  const tag = (from: number) => String.fromCharCode(...bytes.slice(from, from + 4));
  if (tag(0) === "RIFF" && tag(8) === "WEBP") return "image/webp";
  return null;
}

export type UploadResult = { src?: string; error?: string };

export async function uploadRoomPhoto(form: FormData): Promise<UploadResult> {
  await requireAdmin();
  const { t } = await getAdminI18n();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: t.upload.errChoose };
  if (file.size > MAX_UPLOAD) return { error: t.upload.errTooLarge };
  const data = Buffer.from(await file.arrayBuffer());
  const contentType = sniffImage(data);
  if (!contentType) return { error: t.upload.errNotPhoto };
  const size = (key: string) => Math.min(10000, Math.max(1, Number(form.get(key)) | 0));
  const [row] = await db
    .insert(media)
    .values({
      contentType,
      data,
      width: size("width"),
      height: size("height"),
      filename: String(form.get("filename") ?? file.name).slice(0, 200),
    })
    .returning({ id: media.id });
  return { src: `/media/${row.id}` };
}

/** Deletes an uploaded photo, unless a room still uses it. */
export async function deleteUploadedPhoto(src: string): Promise<UploadResult> {
  await requireAdmin();
  const { lang, t } = await getAdminI18n();
  const id = Number(/^\/media\/(\d+)$/.exec(src)?.[1]);
  if (!id) return { error: t.upload.errOnlyUploaded };
  const rooms = await db.select({ name: roomTypes.name, images: roomTypes.images }).from(roomTypes);
  const using = rooms.filter((r) => r.images.includes(src)).map((r) => r.name[lang]);
  if (using.length) return { error: fill(t.upload.errInUse, { rooms: using.join(", ") }) };
  await db.delete(media).where(eq(media.id, id));
  return {};
}

export async function setInquiryStatus(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  const status = form.get("status") === "handled" ? "handled" : "new";
  await db.update(inquiries).set({ status }).where(eq(inquiries.id, id));
  revalidatePath("/admin", "layout");
}
