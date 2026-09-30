import { eq } from "drizzle-orm";
import { db, media } from "@/db";

// Uploaded photos never change (a new upload gets a new id), so browsers and
// the CDN can keep them for good.
export async function GET(_: Request, { params }: RouteContext<"/media/[id]">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return new Response("Not found", { status: 404 });
  const [file] = await db.select({ data: media.data, contentType: media.contentType }).from(media).where(eq(media.id, id)).limit(1);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
