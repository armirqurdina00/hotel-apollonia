import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, verifyAdminSession } from "./auth";

/** Call at the top of every admin page and server action. */
export async function requireAdmin() {
  const jar = await cookies();
  if (!(await verifyAdminSession(jar.get(ADMIN_COOKIE)?.value))) redirect("/admin/login");
}

export const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  checked_in: "Checked in",
  checked_out: "Checked out",
  cancelled: "Cancelled",
  no_show: "No-show",
};

export const STATUS_STYLE: Record<string, string> = {
  pending: "bg-gold-soft text-forest",
  confirmed: "bg-emerald/10 text-emerald",
  checked_in: "bg-ok/15 text-ok",
  checked_out: "bg-black/5 text-muted",
  cancelled: "bg-danger/10 text-danger",
  no_show: "bg-danger/10 text-danger",
};

export const SOURCE_LABEL: Record<string, string> = { web: "Website", phone: "Phone", walk_in: "Walk-in", ota: "Booking.com / OTA" };
