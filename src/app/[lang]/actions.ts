"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, bookings, inquiries, roomTypes } from "@/db";
import { cancellationOpen, createBooking, SoldOutError, validateStay } from "@/lib/engine";
import { bookingToken, verifyBookingToken } from "@/lib/auth";
import { sendBookingEmails, sendCancellationEmail, sendInquiryNotification } from "@/lib/email";
import { isLocale, type Locale } from "@/i18n/config";
import { isISODate } from "@/lib/dates";

export type FormState = {
  error?: string;
  fields?: Record<string, string>;
  values?: Record<string, string>;
  ok?: boolean;
};

const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()\-]{7,20}$/, "phone");
const text = (max: number) => z.string().trim().max(max);

const guestSchema = z.object({
  firstName: text(80).min(1, "required"),
  lastName: text(80).min(1, "required"),
  email: z.string().trim().toLowerCase().pipe(z.email("email")),
  phone,
  country: text(2).optional(),
  arrivalTime: text(20).optional(),
  notes: text(1000).optional(),
  parking: z.literal("on").optional(),
  // Honeypot: real people never see or fill this field.
  website: z.string().max(0).optional(),
});

function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0]);
    out[key] ??= issue.code === "too_small" ? "required" : issue.message;
  }
  return out;
}

function plain(form: FormData) {
  const values: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string") values[k] = v;
  return values;
}

export async function bookRoomAction(_: FormState, form: FormData): Promise<FormState> {
  const values = plain(form);
  const lang: Locale = isLocale(values.lang) ? values.lang : "sq";

  const stay = validateStay(values);
  if (!stay.ok) return { error: stay.error, values };

  const parsed = guestSchema.safeParse(values);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values };
  if (parsed.data.website) return { error: "generic", values };

  const [room] = await db.select().from(roomTypes).where(eq(roomTypes.slug, values.room)).limit(1);
  if (!room) return { error: "sold_out", values };

  let ref: string;
  try {
    const { booking } = await createBooking({
      roomTypeId: room.id,
      stay: stay.value,
      locale: lang,
      guest: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        country: parsed.data.country || null,
        arrivalTime: parsed.data.arrivalTime || null,
        notes: parsed.data.notes || null,
        parking: parsed.data.parking === "on",
      },
    });
    ref = booking.ref;
    await sendBookingEmails(booking, room);
  } catch (e) {
    if (e instanceof SoldOutError) return { error: "sold_out", values };
    console.error("[booking] failed", e);
    return { error: "generic", values };
  }

  redirect(`/${lang}/booking/${ref}?t=${bookingToken(ref)}&new=1`);
}

export async function cancelBookingAction(_: FormState, form: FormData): Promise<FormState> {
  const ref = String(form.get("ref") ?? "");
  const token = String(form.get("t") ?? "");
  const lang = String(form.get("lang") ?? "sq");
  if (!verifyBookingToken(ref, token)) return { error: "generic" };

  const [row] = await db
    .select({ booking: bookings, room: roomTypes })
    .from(bookings)
    .innerJoin(roomTypes, eq(bookings.roomTypeId, roomTypes.id))
    .where(eq(bookings.ref, ref))
    .limit(1);
  if (!row) return { error: "generic" };
  if (row.booking.status === "cancelled") redirect(`/${lang}/booking/${ref}?t=${token}`);
  if (!["pending", "confirmed"].includes(row.booking.status) || !cancellationOpen(row.booking.checkIn)) return { error: "too_late" };

  const [updated] = await db
    .update(bookings)
    .set({ status: "cancelled", updatedAt: new Date().toISOString().replace("T", " ").slice(0, 19) })
    .where(eq(bookings.id, row.booking.id))
    .returning();
  await sendCancellationEmail(updated, row.room);
  redirect(`/${lang}/booking/${ref}?t=${token}`);
}

export async function findBookingAction(_: FormState, form: FormData): Promise<FormState> {
  const values = plain(form);
  const lang = isLocale(values.lang) ? values.lang : "sq";
  const ref = (values.ref ?? "").trim().toUpperCase().replace(/^(APL)?-?/, "APL-");
  const email = (values.email ?? "").trim().toLowerCase();
  const [b] = await db
    .select({ ref: bookings.ref })
    .from(bookings)
    .where(and(eq(bookings.ref, ref), eq(bookings.email, email)))
    .limit(1);
  if (!b) return { error: "not_found", values };
  redirect(`/${lang}/booking/${b.ref}?t=${bookingToken(b.ref)}`);
}

const inquirySchema = z.object({
  kind: z.enum(["table", "meeting"]),
  name: text(120).min(1, "required"),
  phone,
  email: z.union([z.literal(""), z.string().trim().toLowerCase().pipe(z.email("email"))]).optional(),
  date: z.string().refine((v) => isISODate(v), "required"),
  time: text(10).optional(),
  people: z.coerce.number().int().min(1).max(500),
  message: text(2000).optional(),
  website: z.string().max(0).optional(),
});

export async function inquiryAction(_: FormState, form: FormData): Promise<FormState> {
  const values = plain(form);
  const parsed = inquirySchema.safeParse(values);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values };
  if (parsed.data.website) return { ok: true };
  const d = parsed.data;
  const [row] = await db
    .insert(inquiries)
    .values({
      kind: d.kind,
      name: d.name,
      phone: d.phone,
      email: d.email || null,
      date: d.date,
      time: d.time || null,
      people: d.people,
      message: d.message || null,
      locale: isLocale(values.lang) ? values.lang : "sq",
    })
    .returning();
  await sendInquiryNotification(row);
  return { ok: true };
}
