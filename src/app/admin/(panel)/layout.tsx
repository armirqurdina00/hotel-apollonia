import Link from "next/link";
import { count, eq, and } from "drizzle-orm";
import { db, bookings, inquiries } from "@/db";
import { getAdminI18n, latestIds, requireAdmin } from "@/lib/admin";
import { logoutAction } from "../actions";
import { AdminNav } from "@/components/admin/nav";
import { EnableAlerts, LiveUpdates } from "@/components/admin/live-updates";
import { AdminLangSwitch } from "@/components/admin/lang-switch";
import { AdminMobileMenu } from "@/components/admin/mobile-menu";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const { lang, t } = await getAdminI18n();
  const [[pending], [newInq], latest] = await Promise.all([
    db.select({ n: count() }).from(bookings).where(eq(bookings.status, "pending")),
    db.select({ n: count() }).from(inquiries).where(and(eq(inquiries.status, "new"))),
    latestIds(),
  ]);

  // Shown in the desktop sidebar and in the phone/tablet menu panel.
  const sidebar = (
    <>
      <AdminNav badges={{ bookings: pending.n, inquiries: newInq.n }} />
      <div className="mt-auto flex flex-col gap-2 pt-4">
        <EnableAlerts />
        <div className="px-1 py-1">
          <AdminLangSwitch lang={lang} />
        </div>
        <Link href="/sq" className="text-sm text-white/70 hover:text-white px-3 py-2" target="_blank">
          {t.nav.viewWebsite}
        </Link>
        <form action={logoutAction}>
          <button className="text-sm text-white/70 hover:text-white px-3 py-2">{t.nav.signOut}</button>
        </form>
      </div>
    </>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      <LiveUpdates initial={latest} />
      <aside className="crest hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:gap-4 lg:overflow-y-auto lg:p-5">
        <Link href="/admin" className="flex items-center gap-2 font-display text-lg tracking-[0.1em] shrink-0 mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/emblem.png" alt="" className="h-9 w-auto" />
          APOLLONIA
        </Link>
        {sidebar}
      </aside>
      <AdminMobileMenu badge={pending.n + newInq.n}>{sidebar}</AdminMobileMenu>
      <div className="min-w-0 p-4 sm:p-8">{children}</div>
    </div>
  );
}
