import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { max } from "drizzle-orm";
import { db, bookings, inquiries } from "@/db";
import { ADMIN_COOKIE, verifyAdminSession } from "./auth";
import { ADMIN_DICTIONARIES, ADMIN_LANG_COOKIE, DEFAULT_ADMIN_LANG, isAdminLang } from "@/i18n/admin";

/** Call at the top of every admin page and server action. */
export async function requireAdmin() {
  const jar = await cookies();
  if (!(await verifyAdminSession(jar.get(ADMIN_COOKIE)?.value))) redirect("/admin/login");
}

/** The staff panel's language (Albanian unless switched) and its text. */
export async function getAdminI18n() {
  const saved = (await cookies()).get(ADMIN_LANG_COOKIE)?.value;
  const lang = isAdminLang(saved) ? saved : DEFAULT_ADMIN_LANG;
  return { lang, t: ADMIN_DICTIONARIES[lang] };
}

/** The newest booking and request ids; the admin panel polls for anything after them. */
export async function latestIds() {
  const [[b], [i]] = await Promise.all([
    db.select({ id: max(bookings.id) }).from(bookings),
    db.select({ id: max(inquiries.id) }).from(inquiries),
  ]);
  return { b: b.id ?? 0, i: i.id ?? 0 };
}

export const STATUS_STYLE: Record<string, string> = {
  pending: "bg-gold-soft text-forest",
  confirmed: "bg-emerald/10 text-emerald",
  checked_in: "bg-ok/15 text-ok",
  checked_out: "bg-black/5 text-muted",
  cancelled: "bg-danger/10 text-danger",
  no_show: "bg-danger/10 text-danger",
};
