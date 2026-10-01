import { desc, eq } from "drizzle-orm";
import { db, inquiries } from "@/db";
import { getAdminI18n, requireAdmin } from "@/lib/admin";
import { isMeetingDuration } from "@/lib/hotel";
import { formatDate, formatDateTime } from "@/lib/dates";
import { setInquiryStatus } from "../../actions";

export async function generateMetadata() {
  const { t } = await getAdminI18n();
  return { title: t.inquiries.title };
}
export const dynamic = "force-dynamic";

export default async function InquiriesPage({ searchParams }: PageProps<"/admin/inquiries">) {
  await requireAdmin();
  const { lang, t } = await getAdminI18n();
  const q = t.inquiries;
  const sp = await searchParams;
  const showAll = sp.show === "all";
  const rows = await db
    .select()
    .from(inquiries)
    .where(showAll ? undefined : eq(inquiries.status, "new"))
    .orderBy(desc(inquiries.createdAt))
    .limit(200);

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl">{q.title}</h1>
        <a href={showAll ? "/admin/inquiries" : "/admin/inquiries?show=all"} className="link">
          {showAll ? q.showNew : q.showAll}
        </a>
      </div>
      <p className="mt-2 text-muted">{q.lead}</p>
      {rows.length === 0 ? (
        <p className="mt-8 text-muted">{q.none}</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((i) => (
            <li key={i.id} className={`rounded-[var(--radius-soft)] border border-line bg-mist ${i.status === "handled" ? "opacity-70" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line px-5 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${i.kind === "table" ? "bg-gold-soft text-forest" : "bg-emerald/10 text-emerald"}`}>{q.kind[i.kind]}</span>
                  {i.status === "handled" && <span className="rounded-full bg-black/5 px-2.5 py-0.5 text-xs font-semibold text-muted">{q.done}</span>}
                </div>
                <span className="text-sm text-muted">
                  {q.receivedAt.split("{when}")[0]}
                  <strong className="font-semibold text-ink">{formatDateTime(i.createdAt, lang, { weekday: "long", month: "short", year: true })}</strong>
                  {q.receivedAt.split("{when}")[1]}
                </span>
              </div>

              <div className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-start">
                <div className="min-w-0">
                  <h2 className="font-sans text-xl font-semibold">{i.name}</h2>
                  <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
                    <li>
                      <a className="link" href={`tel:${i.phone.replace(/[^+\d]/g, "")}`}>
                        {i.phone}
                      </a>
                    </li>
                    <li>
                      <a className="link" href={`https://wa.me/${i.phone.replace(/[^\d]/g, "")}`} target="_blank" rel="noopener">
                        WhatsApp
                      </a>
                    </li>
                    {i.email && (
                      <li className="min-w-0 break-all">
                        <a className="link" href={`mailto:${i.email}`}>
                          {i.email}
                        </a>
                      </li>
                    )}
                  </ul>

                  <dl className="mt-4 grid grid-cols-[1.6fr_1fr_1fr] gap-px overflow-hidden rounded-[var(--radius-soft)] border border-line bg-line max-w-lg">
                    {[
                      [q.fields.date, i.date ? formatDate(i.date, lang, { weekday: "long", year: true }) : "–"],
                      i.kind === "meeting"
                        ? [q.fields.duration, isMeetingDuration(i.time) ? q.durations[i.time] : (i.time ?? "–")]
                        : [q.fields.time, i.time ?? "–"],
                      [q.fields.people, i.people != null ? String(i.people) : "–"],
                    ].map(([k, v]) => (
                      <div key={k} className="bg-white px-3 py-2.5">
                        <dt className="text-xs text-muted">{k}</dt>
                        <dd className="mt-0.5 font-semibold tabular-nums first-letter:uppercase">{v}</dd>
                      </div>
                    ))}
                  </dl>

                  {i.message && (
                    <div className="mt-4 max-w-lg rounded-[var(--radius-soft)] border-l-2 border-gold bg-white px-4 py-3">
                      <p className="text-xs text-muted">{q.fields.message}</p>
                      <p className="mt-0.5 whitespace-pre-line">{i.message}</p>
                    </div>
                  )}
                </div>

                <form action={setInquiryStatus}>
                  <input type="hidden" name="id" value={i.id} />
                  <input type="hidden" name="status" value={i.status === "new" ? "handled" : "new"} />
                  <button className={`btn w-full sm:w-auto ${i.status === "new" ? "btn-primary" : "btn-ghost"}`}>{i.status === "new" ? q.markHandled : q.markNew}</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
