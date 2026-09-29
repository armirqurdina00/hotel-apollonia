import "server-only";
import { Resend } from "resend";
import type { Booking, Inquiry, RoomType } from "@/db";
import { getDictionary, isLocale, plural, fill, type Locale } from "@/i18n";
import { HOTEL, siteUrl } from "./hotel";
import { formatDate, formatMoney } from "./dates";
import { bookingToken } from "./auth";

type Mail = { to: string; subject: string; text: string; html: string };

async function send(mail: Mail) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[email:dry-run] to=${mail.to} subject="${mail.subject}"\n${mail.text}\n`);
    return;
  }
  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "Hotel Apollonia <onboarding@resend.dev>",
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
    if (error) console.error("[email] send failed", error);
  } catch (e) {
    // A failed email must never fail the booking itself.
    console.error("[email] send threw", e);
  }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function wrap(rows: [string, string][], intro: string, link?: { href: string; label: string }) {
  const table = rows
    .map(([k, v]) => `<tr><td style="padding:6px 16px 6px 0;color:#56645c">${esc(k)}</td><td style="padding:6px 0;color:#13241b">${esc(v)}</td></tr>`)
    .join("");
  return `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;max-width:560px;margin:auto;color:#13241b">
<p style="font-size:20px;margin:0 0 16px">${esc(HOTEL.name)}</p>
<p>${esc(intro)}</p>
<table style="border-collapse:collapse;margin:16px 0">${table}</table>
${link ? `<p><a href="${link.href}" style="display:inline-block;background:#0b6b43;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">${esc(link.label)}</a></p>` : ""}
<p style="color:#56645c;font-size:13px">${esc(HOTEL.street)}, ${esc(HOTEL.city)} · ${esc(HOTEL.phone)}</p></div>`;
}

export function bookingLink(b: Pick<Booking, "ref" | "locale">) {
  return `${siteUrl()}/${b.locale}/booking/${b.ref}?t=${bookingToken(b.ref)}`;
}

function bookingRows(b: Booking, room: RoomType, locale: Locale): [string, string][] {
  const t = getDictionary(locale);
  const guests = [plural(locale, t.search.adultsCount, b.adults), b.children ? plural(locale, t.search.childrenCount, b.children) : ""]
    .filter(Boolean)
    .join(", ");
  return [
    [t.confirm.ref, b.ref],
    [t.confirm.room, `${b.rooms > 1 ? b.rooms + " × " : ""}${room.name[locale]}`],
    [t.search.checkIn, `${formatDate(b.checkIn, locale)}, ${fill(t.confirm.checkInTime, { time: HOTEL.checkInFrom })}`],
    [t.search.checkOut, `${formatDate(b.checkOut, locale)}, ${fill(t.confirm.checkOutTime, { time: HOTEL.checkOutUntil })}`],
    [t.confirm.party, guests],
    [t.confirm.total, formatMoney(b.totalCents, locale)],
  ];
}

export async function sendBookingEmails(b: Booking, room: RoomType) {
  const locale: Locale = isLocale(b.locale) ? b.locale : "sq";
  const t = getDictionary(locale);
  const rows = bookingRows(b, room, locale);
  const link = bookingLink(b);
  const intro = `${t.confirm.title} ${fill(t.checkout.cancellation, { hours: HOTEL.freeCancellationHours })}`;
  await send({
    to: b.email,
    subject: `${t.confirm.title} ${b.ref}`,
    text: [intro, ...rows.map(([k, v]) => `${k}: ${v}`), link].join("\n"),
    html: wrap(rows, intro, { href: link, label: t.nav.manage }),
  });

  const staff = process.env.HOTEL_NOTIFY_EMAIL;
  if (staff) {
    const staffRows = bookingRows(b, room, "sq");
    const extra: [string, string][] = [
      ["Mysafiri", `${b.firstName} ${b.lastName}`],
      ["Telefoni", b.phone],
      ["Email", b.email],
      ["Parking", b.parking ? "Po" : "Jo"],
      ...(b.arrivalTime ? [["Mbërritja", b.arrivalTime] as [string, string]] : []),
      ...(b.notes ? [["Kërkesa", b.notes] as [string, string]] : []),
    ];
    await send({
      to: staff,
      subject: `Rezervim i ri ${b.ref}: ${b.firstName} ${b.lastName}, ${b.checkIn}`,
      text: [...staffRows, ...extra].map(([k, v]) => `${k}: ${v}`).join("\n"),
      html: wrap([...staffRows, ...extra], "Rezervim i ri nga faqja.", { href: `${siteUrl()}/admin/bookings/${b.id}`, label: "Hape në panel" }),
    });
  }
}

export async function sendCancellationEmail(b: Booking, room: RoomType) {
  const locale: Locale = isLocale(b.locale) ? b.locale : "sq";
  const t = getDictionary(locale);
  const rows = bookingRows(b, room, locale);
  await send({
    to: b.email,
    subject: `${t.confirm.cancelled} ${b.ref}`,
    text: [t.confirm.cancelled, ...rows.map(([k, v]) => `${k}: ${v}`)].join("\n"),
    html: wrap(rows, t.confirm.cancelled),
  });
  const staff = process.env.HOTEL_NOTIFY_EMAIL;
  if (staff) {
    await send({
      to: staff,
      subject: `Anuluar ${b.ref}: ${b.firstName} ${b.lastName}`,
      text: `Mysafiri e anuloi rezervimin ${b.ref} (${b.checkIn} – ${b.checkOut}).`,
      html: wrap(bookingRows(b, room, "sq"), "Mysafiri e anuloi rezervimin."),
    });
  }
}

export async function sendInquiryNotification(i: Inquiry) {
  const staff = process.env.HOTEL_NOTIFY_EMAIL;
  if (!staff) {
    console.info(`[inquiry] ${i.kind} from ${i.name} ${i.phone}`);
    return;
  }
  const label = i.kind === "table" ? "Rezervim tavoline" : i.kind === "meeting" ? "Kërkesë për sallë" : "Mesazh";
  const rows: [string, string][] = [
    ["Emri", i.name],
    ["Telefoni", i.phone],
    ...(i.email ? [["Email", i.email] as [string, string]] : []),
    ...(i.date ? [["Data", `${i.date}${i.time ? " " + i.time : ""}`] as [string, string]] : []),
    ...(i.people ? [["Persona", String(i.people)] as [string, string]] : []),
    ...(i.message ? [["Mesazhi", i.message] as [string, string]] : []),
  ];
  await send({
    to: staff,
    subject: `${label}: ${i.name}`,
    text: rows.map(([k, v]) => `${k}: ${v}`).join("\n"),
    html: wrap(rows, label, { href: `${siteUrl()}/admin/inquiries`, label: "Hape në panel" }),
  });
}
