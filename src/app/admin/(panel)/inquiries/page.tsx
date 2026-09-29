import { desc, eq } from "drizzle-orm";
import { db, inquiries } from "@/db";
import { requireAdmin } from "@/lib/admin";
import { formatDate } from "@/lib/dates";
import { setInquiryStatus } from "../../actions";

export const metadata = { title: "Tables & meetings" };
export const dynamic = "force-dynamic";

const KIND = { table: "Table", meeting: "Conference room", contact: "Message" } as const;

export default async function InquiriesPage({ searchParams }: PageProps<"/admin/inquiries">) {
  await requireAdmin();
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
        <h1 className="text-4xl">Tables &amp; meetings</h1>
        <a href={showAll ? "/admin/inquiries" : "/admin/inquiries?show=all"} className="link">
          {showAll ? "Show only new requests" : "Show handled requests too"}
        </a>
      </div>
      <p className="mt-2 text-muted">Requests from the website. Call the guest back, then mark the request as handled.</p>
      {rows.length === 0 ? (
        <p className="mt-8 text-muted">No new requests. You&apos;re all caught up.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((i) => (
            <li key={i.id} className={`rounded-[var(--radius-soft)] border border-line bg-mist p-5 ${i.status === "handled" ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted">
                    {KIND[i.kind]}, received {i.createdAt.slice(0, 16)} UTC
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {i.name}, {i.people} {i.people === 1 ? "person" : "people"}
                    {i.date && `, ${formatDate(i.date, "en", { weekday: "short", year: true })}`}
                    {i.time && ` at ${i.time}`}
                  </p>
                  <p className="mt-1 flex flex-wrap gap-x-4">
                    <a className="link" href={`tel:${i.phone.replace(/[^+\d]/g, "")}`}>
                      {i.phone}
                    </a>
                    {i.email && (
                      <a className="link" href={`mailto:${i.email}`}>
                        {i.email}
                      </a>
                    )}
                  </p>
                  {i.message && <p className="mt-3 whitespace-pre-line">{i.message}</p>}
                </div>
                <form action={setInquiryStatus}>
                  <input type="hidden" name="id" value={i.id} />
                  <input type="hidden" name="status" value={i.status === "new" ? "handled" : "new"} />
                  <button className="btn btn-ghost !min-h-10 !py-1.5">{i.status === "new" ? "Mark handled" : "Mark as new"}</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
