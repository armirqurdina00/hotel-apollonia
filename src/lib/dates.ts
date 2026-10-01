/**
 * Calendar dates as "YYYY-MM-DD" strings. All arithmetic is done in UTC so a
 * night never shifts because of the server's or the guest's timezone.
 */
export type ISODate = string;

const RE = /^\d{4}-\d{2}-\d{2}$/;

export function isISODate(v: unknown): v is ISODate {
  if (typeof v !== "string" || !RE.test(v)) return false;
  const d = parse(v);
  return !Number.isNaN(d.getTime()) && format(d) === v;
}

export function parse(d: ISODate): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

export function format(d: Date): ISODate {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: ISODate, n: number): ISODate {
  const x = parse(d);
  x.setUTCDate(x.getUTCDate() + n);
  return format(x);
}

export function diffDays(from: ISODate, to: ISODate): number {
  return Math.round((parse(to).getTime() - parse(from).getTime()) / 86_400_000);
}

/** Nights of a stay: every date from check-in up to, not including, check-out. */
export function nightsBetween(checkIn: ISODate, checkOut: ISODate): ISODate[] {
  const out: ISODate[] = [];
  for (let d = checkIn; d < checkOut; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Today's date in Kosovo. */
/** Kosovo's time zone (CET/CEST). */
const HOTEL_TZ = "Europe/Belgrade";

export function todayInGjakova(): ISODate {
  return new Intl.DateTimeFormat("en-CA", { timeZone: HOTEL_TZ }).format(new Date());
}

export function weekday(d: ISODate): number {
  return parse(d).getUTCDay();
}

export function monthStart(d: ISODate): ISODate {
  return d.slice(0, 8) + "01";
}

export function addMonths(d: ISODate, n: number): ISODate {
  const x = parse(monthStart(d));
  x.setUTCMonth(x.getUTCMonth() + n);
  return format(x);
}

export function daysInMonth(d: ISODate): number {
  const x = parse(monthStart(d));
  return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0)).getUTCDate();
}

/*
 * Names are tabled rather than taken from Intl: browsers don't all ship
 * Albanian locale data, and server and client must render identical text.
 */
type Lang = "sq" | "en" | "de";
const NAMES: Record<Lang, { months: string[]; monthsShort: string[]; days: string[]; daysShort: string[]; daysNarrow: string[] }> = {
  en: {
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    daysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    daysNarrow: ["S", "M", "T", "W", "T", "F", "S"],
  },
  sq: {
    months: ["janar", "shkurt", "mars", "prill", "maj", "qershor", "korrik", "gusht", "shtator", "tetor", "nëntor", "dhjetor"],
    monthsShort: ["jan", "shk", "mar", "pri", "maj", "qer", "korr", "gush", "sht", "tet", "nën", "dhj"],
    days: ["e diel", "e hënë", "e martë", "e mërkurë", "e enjte", "e premte", "e shtunë"],
    daysShort: ["Die", "Hën", "Mar", "Mër", "Enj", "Pre", "Sht"],
    daysNarrow: ["D", "H", "M", "M", "E", "P", "S"],
  },
  de: {
    months: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
    monthsShort: ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."],
    days: ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"],
    daysShort: ["So.", "Mo.", "Di.", "Mi.", "Do.", "Fr.", "Sa."],
    daysNarrow: ["S", "M", "D", "M", "D", "F", "S"],
  },
};

export type DateStyle = { weekday?: "short" | "long"; month?: "short" | "long"; year?: boolean };

export function formatDate(d: ISODate, locale: Lang, style: DateStyle = { weekday: "short", month: "short", year: true }) {
  const n = NAMES[locale];
  const x = parse(d);
  const day = x.getUTCDate();
  const mon = (style.month === "long" ? n.months : n.monthsShort)[x.getUTCMonth()];
  const wd = style.weekday ? (style.weekday === "long" ? n.days : n.daysShort)[x.getUTCDay()] : "";
  const core = locale === "de" ? `${day}. ${mon}` : `${day} ${mon}`;
  return `${wd ? wd + ", " : ""}${core}${style.year ? " " + x.getUTCFullYear() : ""}`;
}

export function formatMonthYear(d: ISODate, locale: Lang) {
  const x = parse(d);
  return `${NAMES[locale].months[x.getUTCMonth()]} ${x.getUTCFullYear()}`;
}

/** Monday-first narrow weekday initials. */
export function weekdayInitials(locale: Lang) {
  const n = NAMES[locale].daysNarrow;
  return [...n.slice(1), n[0]];
}

/**
 * A UTC timestamp as SQLite stores it ("2026-10-01 08:48:29") shown in hotel
 * time (Kosovo, summer and winter time handled): "Thu, 1 Oct 2026, 10:48".
 */
export function formatDateTime(utc: string, locale: Lang, style?: DateStyle) {
  const at = new Date(utc.replace(" ", "T") + "Z");
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: HOTEL_TZ }).format(at);
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: HOTEL_TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(at);
  return `${formatDate(day, locale, style)}, ${time}`;
}

export function formatMoney(cents: number, locale: Lang = "en") {
  const neg = cents < 0;
  const whole = Math.round(Math.abs(cents) / 100);
  const rest = Math.abs(cents) % 100;
  const sep = locale === "en" ? "," : locale === "de" ? "." : "\u00a0";
  let num = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  if (rest && Math.abs(cents) % 100 !== 0) num = `${Math.floor(Math.abs(cents) / 100)}${locale === "en" ? "." : ","}${String(rest).padStart(2, "0")}`;
  const out = locale === "en" ? `€${num}` : `${num}\u00a0€`;
  return neg ? `−${out}` : out;
}
