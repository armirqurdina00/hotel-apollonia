import Link from "next/link";
import { count, eq, and } from "drizzle-orm";
import { db, bookings, inquiries } from "@/db";
import { getAdminI18n, latestIds, requireAdmin } from "@/lib/admin";
import { logoutAction } from "../actions";
import { AdminNav } from "@/components/admin/nav";
import { LiveUpdates } from "@/components/admin/live-updates";
import { AdminLangSwitch } from "@/components/admin/lang-switch";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const { lang, t } = await getAdminI18n();
  const [[pending], [newInq], latest] = await Promise.all([
    db.select({ n: count() }).from(bookings).where(eq(bookings.status, "pending")),
    db.select({ n: count() }).from(inquiries).where(and(eq(inquiries.status, "new"))),
    latestIds(),
  ]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="crest lg:min-h-dvh lg:sticky lg:top-0 lg:h-dvh flex lg:flex-col gap-4 p-4 lg:p-5 overflow-x-auto">
        <Link href="/admin" className="flex items-center gap-2 font-display text-lg tracking-[0.1em] shrink-0 lg:mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/emblem.png" alt="" className="h-9 w-auto" />
          APOLLONIA
        </Link>
        <AdminNav badges={{ bookings: pending.n, inquiries: newInq.n }} />
        <div className="lg:mt-auto flex lg:flex-col gap-2 shrink-0">
          <LiveUpdates initial={latest} />
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
      </aside>
      <div className="min-w-0 p-4 sm:p-8">{children}</div>
    </div>
  );
}
