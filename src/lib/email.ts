import "server-only";
import { Resend } from "resend";
import type { Booking, Inquiry, RoomType } from "@/db";
import { getDictionary, isLocale, plural, fill, type Locale } from "@/i18n";
import { HOTEL, isMeetingDuration, siteUrl } from "./hotel";
import { formatDate, formatMoney } from "./dates";
import { bookingToken } from "./auth";
import { getSiteSettings, type SiteSettings } from "./settings";

type Mail = { to: string | string[]; subject: string; text: string; html: string; replyTo?: string };

async function send(mail: Mail) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[email:dry-run] to=${mail.to} subject="${mail.subject}"\n${mail.text}\n`);
    return;
  }
  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({
      // Empty settings count as unset, so `EMAIL_FROM=` falls back to Resend's test sender.
      from: process.env.EMAIL_FROM || "Hotel Apollonia <onboarding@resend.dev>",
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      replyTo: mail.replyTo || process.env.EMAIL_REPLY_TO || undefined,
    });
    if (error) console.error("[email] send failed", error);
  } catch (e) {
    // A failed email must never fail the booking itself.
    console.error("[email] send threw", e);
  }
}

/** HOTEL_NOTIFY_EMAIL, which may list several addresses separated by commas. */
function staffInbox() {
  return (process.env.HOTEL_NOTIFY_EMAIL ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

// The site's palette (src/app/globals.css). Email clients ignore CSS variables and web fonts,
// so colours are inlined and Georgia stands in for the Marcellus headings.
const C = { forest: "#0c3a27", emerald: "#0b6b43", gold: "#c9a462", goldSoft: "#f4ecda", mist: "#f3f6f2", line: "#dbe3dc", ink: "#13241b", muted: "#56645c", page: "#eef2ee" };
const SANS = "'Helvetica Neue',Helvetica,Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";

type Row = [string, string];
type Layout = {
  lang: Locale;
  preheader: string;
  heading: string;
  intro: string;
  /** A small label above the heading, e.g. the booking number. */
  eyebrow?: string;
  rows?: Row[];
  /** Highlighted last line of the details card, e.g. the total. */
  total?: Row;
  button?: { href: string; label: string };
  note?: string;
};

/** A detail's first line is the value; any further lines are a quieter note, like the check-in time. */
function valueHtml(v: string) {
  const [first, ...rest] = v.split("\n");
  return esc(first) + rest.map((line) => `<br><span style="font-size:13px;font-weight:400;color:${C.muted}">${esc(line)}</span>`).join("");
}

/** One themed, table-based layout for every email (tables keep Outlook and Gmail in line). */
function layout(m: Layout, { contact, links }: SiteSettings) {
  const site = siteUrl();
  const rows = (m.rows ?? [])
    .map(
      ([k, v], i) =>
        `<tr><td style="padding:10px 0;${i ? `border-top:1px solid ${C.line};` : ""}color:${C.muted};font-size:14px;vertical-align:top;width:40%">${esc(k)}</td>` +
        `<td style="padding:10px 0;${i ? `border-top:1px solid ${C.line};` : ""}color:${C.ink};font-size:15px;font-weight:600;vertical-align:top">${valueHtml(v)}</td></tr>`,
    )
    .join("");
  const total = m.total
    ? `<tr><td style="padding:14px 0 4px;border-top:1px solid ${C.line};color:${C.muted};font-size:14px">${esc(m.total[0])}</td>` +
      `<td style="padding:14px 0 4px;border-top:1px solid ${C.line};color:${C.emerald};font-size:22px;font-weight:700">${esc(m.total[1])}</td></tr>`
    : "";
  const card = rows || total ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:${C.mist};border-radius:8px"><tr><td style="padding:8px 20px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}${total}</table></td></tr></table>` : "";
  const button = m.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px"><tr><td style="background:${C.emerald};border-radius:6px"><a href="${m.button.href}" style="display:inline-block;padding:14px 24px;font-family:${SANS};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none">${esc(m.button.label)}</a></td></tr></table>`
    : "";

  return `<!doctype html>
<html lang="${m.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(m.heading)}</title>
<style>@media (max-width:480px){.pad{padding-left:20px!important;padding-right:20px!important}}</style></head>
<body style="margin:0;padding:0;background:${C.page};font-family:${SANS};color:${C.ink}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(m.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page}"><tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:10px;overflow:hidden">
<tr><td align="center" style="background:${C.forest};padding:28px 24px 22px">
<img src="${site}/brand/emblem.png" width="64" height="48" alt="" style="display:block;border:0;width:64px;height:auto">
<div style="margin-top:12px;font-family:${SERIF};font-size:15px;letter-spacing:0.22em;color:#ffffff">HOTEL APOLLONIA</div>
</td></tr>
<tr><td style="height:3px;line-height:3px;font-size:0;background:${C.gold}">&nbsp;</td></tr>
<tr><td class="pad" style="padding:32px 32px 8px">
${m.eyebrow ? `<p style="margin:0 0 8px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:${C.gold};font-weight:700">${esc(m.eyebrow)}</p>` : ""}
<h1 style="margin:0 0 14px;font-family:${SERIF};font-weight:400;font-size:26px;line-height:1.25;color:${C.ink}">${esc(m.heading)}</h1>
<p style="margin:0;font-size:16px;line-height:1.55;color:${C.ink}">${esc(m.intro)}</p>
${card}${button}
${m.note ? `<p style="margin:0 0 24px;font-size:14px;line-height:1.55;color:${C.muted}">${esc(m.note)}</p>` : ""}
</td></tr>
<tr><td class="pad" style="padding:20px 32px 28px;border-top:1px solid ${C.line};font-size:13px;line-height:1.6;color:${C.muted}">
<strong style="color:${C.ink}">${esc(HOTEL.name)}</strong><br>
${esc(contact.street)}, ${esc(contact.postalCode)} ${esc(contact.city)}, ${esc(contact.country)}<br>
<a href="${links.phone}" style="color:${C.emerald};text-decoration:none">${esc(contact.phone)}</a> &nbsp;·&nbsp;
<a href="${site}/${m.lang}" style="color:${C.emerald};text-decoration:none">${esc(site.replace(/^https?:\/\//, ""))}</a> &nbsp;·&nbsp;
${contact.instagram ? `<a href="${contact.instagram}" style="color:${C.emerald};text-decoration:none">Instagram</a>` : `<a href="${links.whatsapp}" style="color:${C.emerald};text-decoration:none">WhatsApp</a>`}
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/** Plain-text version for clients that don't show HTML (and for spam filters). */
function plainText(m: Layout, { contact }: SiteSettings) {
  return [
    m.heading,
    "",
    m.intro,
    "",
    ...(m.rows ?? []).map(([k, v]) => `${k}: ${v}`),
    ...(m.total ? [`${m.total[0]}: ${m.total[1]}`] : []),
    ...(m.button ? ["", `${m.button.label}: ${m.button.href}`] : []),
    ...(m.note ? ["", m.note] : []),
    "",
    `${HOTEL.name}, ${contact.street}, ${contact.city} · ${contact.phone}`,
  ].join("\n");
}

async function compose(to: string | string[], subject: string, m: Layout, replyTo?: string): Promise<Mail> {
  const settings = await getSiteSettings();
  return { to, subject, html: layout(m, settings), text: plainText(m, settings), replyTo };
}

export function bookingLink(b: Pick<Booking, "ref" | "locale">) {
  return `${siteUrl()}/${b.locale}/booking/${b.ref}?t=${bookingToken(b.ref)}`;
}

const localeOf = (v: string | null | undefined): Locale => (v && isLocale(v) ? v : "sq");

function stayRows(b: Booking, room: RoomType, locale: Locale): Row[] {
  const t = getDictionary(locale);
  const guests = [plural(locale, t.search.adultsCount, b.adults), b.children ? plural(locale, t.search.childrenCount, b.children) : ""].filter(Boolean).join(", ");
  return [
    [t.confirm.room, `${b.rooms > 1 ? b.rooms + " × " : ""}${room.name[locale]}`],
    [t.search.checkIn, `${formatDate(b.checkIn, locale)}\n${fill(t.confirm.checkInTime, { time: HOTEL.checkInFrom })}`],
    [t.search.checkOut, `${formatDate(b.checkOut, locale)}\n${fill(t.confirm.checkOutTime, { time: HOTEL.checkOutUntil })}`],
    [t.confirm.party, guests],
  ];
}

/** Guest email for a booking that is (now) confirmed. */
async function guestBooked(b: Booking, room: RoomType, kind: "booked" | "confirmed") {
  const { contact } = await getSiteSettings();
  const locale = localeOf(b.locale);
  const t = getDictionary(locale);
  const name = b.firstName;
  return compose(b.email, fill(kind === "booked" ? t.email.bookedSubject : t.email.confirmedSubject, { ref: b.ref }), {
    lang: locale,
    preheader: fill(t.email.bookedPreheader, { room: room.name[locale], dates: `${formatDate(b.checkIn, locale, { month: "short" })} – ${formatDate(b.checkOut, locale, { month: "short" })}` }),
    eyebrow: `${t.confirm.ref} ${b.ref}`,
    heading: t.confirm.title,
    intro: fill(kind === "booked" ? t.email.bookedIntro : t.email.confirmedIntro, { name }),
    rows: stayRows(b, room, locale),
    total: [t.confirm.total, formatMoney(b.totalCents, locale)],
    button: { href: bookingLink(b), label: t.email.manage },
    note: `${fill(t.checkout.cancellation, { hours: HOTEL.freeCancellationHours })} ${fill(t.email.questions, { phone: contact.phone })}`,
  });
}

/** Staff email, in Albanian like the staff panel's default. */
function staffBooking(b: Booking, room: RoomType, heading: string, intro: string) {
  const rows: Row[] = [
    ["Mysafiri", `${b.firstName} ${b.lastName}`],
    ["Telefoni", b.phone],
    ...(b.email ? [["Email", b.email] as Row] : []),
    ...stayRows(b, room, "sq"),
    ["Parkimi", b.parking ? "Po, duhet një vend" : "Jo"],
    ...(b.arrivalTime ? [["Ora e mbërritjes", b.arrivalTime] as Row] : []),
    ...(b.notes ? [["Kërkesat", b.notes] as Row] : []),
  ];
  return {
    lang: "sq" as Locale,
    preheader: `${b.firstName} ${b.lastName}, ${room.name.sq}, ${formatDate(b.checkIn, "sq", { month: "short" })} – ${formatDate(b.checkOut, "sq", { month: "short" })}`,
    eyebrow: b.ref,
    heading,
    intro,
    rows,
    total: ["Totali", formatMoney(b.totalCents, "sq")] as Row,
    button: { href: `${siteUrl()}/admin/bookings/${b.id}`, label: "Hape në panel" },
  };
}

/** After a booking: the guest's confirmation and, for website bookings, the hotel's notice. */
export async function sendBookingEmails(b: Booking, room: RoomType) {
  if (b.email) await send(await guestBooked(b, room, "booked"));
  const staff = staffInbox();
  // Staff entering a phone or walk-in booking don't need an email about it.
  if (staff.length && b.source === "web") {
    const m = staffBooking(b, room, "Rezervim i ri", "Një mysafir rezervoi nga faqja e internetit. Përgjigjuni këtij emaili për t'i shkruar mysafirit.");
    await send(await compose(staff, `Rezervim i ri ${b.ref}: ${b.firstName} ${b.lastName}, ${formatDate(b.checkIn, "sq", { month: "short" })}`, m, b.email || undefined));
  }
}

/** When staff confirm a booking that was waiting (e.g. a phone booking saved as pending). */
export async function sendBookingConfirmedEmail(b: Booking, room: RoomType) {
  if (b.email) await send(await guestBooked(b, room, "confirmed"));
}

/** Tells the guest their booking is cancelled; tells the hotel only when the guest did it. */
export async function sendCancellationEmail(b: Booking, room: RoomType, by: "guest" | "hotel") {
  const locale = localeOf(b.locale);
  const t = getDictionary(locale);
  const { contact } = await getSiteSettings();
  if (b.email) {
    await send(
      await compose(b.email, fill(t.email.cancelledSubject, { ref: b.ref }), {
        lang: locale,
        preheader: fill(t.email.cancelledIntro, { ref: b.ref }),
        eyebrow: `${t.confirm.ref} ${b.ref}`,
        heading: t.confirm.cancelled,
        intro: fill(t.email.cancelledIntro, { ref: b.ref }),
        rows: stayRows(b, room, locale),
        button: { href: `${siteUrl()}/${locale}/rooms`, label: t.email.rebook },
        note: fill(t.email.questions, { phone: contact.phone }),
      }),
    );
  }
  const staff = staffInbox();
  if (staff.length && by === "guest") {
    const m = staffBooking(b, room, "Rezervim i anuluar", "Mysafiri e anuloi rezervimin nga faqja. Dhoma u lirua për të tjerët.");
    await send(await compose(staff, `Anuluar ${b.ref}: ${b.firstName} ${b.lastName}`, m, b.email || undefined));
  }
}

/** A table or conference room request: a notice for the hotel and a receipt for the guest. */
export async function sendInquiryEmails(i: Inquiry) {
  const locale = localeOf(i.locale);
  const t = getDictionary(locale);
  const { contact } = await getSiteSettings();
  // A conference request's `time` is a duration code; a table's is a clock time.
  const slot = (l: Locale) => (isMeetingDuration(i.time) ? getDictionary(l).forms.durations[i.time] : i.time);
  const when = [i.date && formatDate(i.date, locale, { weekday: "long", month: "short", year: true }), slot(locale)].filter(Boolean).join(", ");

  const staff = staffInbox();
  if (staff.length) {
    const label = i.kind === "table" ? "Kërkesë për tavolinë" : i.kind === "meeting" ? "Kërkesë për sallën e konferencave" : "Mesazh";
    const rows: Row[] = [
      ["Emri", i.name],
      ["Telefoni", i.phone],
      ...(i.email ? [["Email", i.email] as Row] : []),
      ...(i.date ? [["Data", [formatDate(i.date, "sq", { weekday: "long", month: "short", year: true }), slot("sq")].filter(Boolean).join(", ")] as Row] : []),
      ...(i.people ? [["Persona", String(i.people)] as Row] : []),
      ...(i.message ? [["Mesazhi", i.message] as Row] : []),
    ];
    await send(
      await compose(
        staff,
        `${label}: ${i.name}${i.date ? `, ${formatDate(i.date, "sq", { month: "short" })}` : ""}`,
        {
          lang: "sq",
          preheader: `${i.name}, ${i.phone}`,
          heading: label,
          intro: "Kërkesë e re nga faqja e internetit. Telefononi mysafirin për ta konfirmuar.",
          rows,
          button: { href: `${siteUrl()}/admin/inquiries`, label: "Hape në panel" },
        },
        i.email || undefined,
      ),
    );
  } else {
    console.info(`[inquiry] ${i.kind} from ${i.name} ${i.phone}`);
  }

  if (i.email && (i.kind === "table" || i.kind === "meeting")) {
    const rows: Row[] = [
      ...(when ? [[t.forms.date, when] as Row] : []),
      ...(i.people ? [[t.forms.people, String(i.people)] as Row] : []),
      ...(i.message ? [[t.forms.message, i.message] as Row] : []),
    ];
    const subject = i.kind === "table" ? t.email.tableSubject : t.email.meetingSubject;
    await send(
      await compose(i.email, subject, {
        lang: locale,
        preheader: i.kind === "table" ? t.forms.sentTable : t.forms.sentMeeting,
        heading: subject,
        intro: `${fill(t.email.requestIntro, { name: i.name })} ${i.kind === "table" ? t.forms.sentTable : t.forms.sentMeeting}`,
        rows,
        note: fill(t.email.questions, { phone: i.kind === "table" ? contact.barPhone : contact.phone }),
      }),
    );
  }
}
