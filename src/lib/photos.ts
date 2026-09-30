import "server-only";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { desc } from "drizzle-orm";
import { db, media } from "@/db";

const DIR = path.join(process.cwd(), "public", "photos");

export type LibraryPhoto = { src: string; name: string; uploaded: boolean };

/**
 * Photos staff can attach to a room: uploads (newest first), then the photos
 * shipped in public/photos. next.config traces that folder into the admin
 * function so the listing also works on Vercel.
 */
export async function listPhotos(): Promise<LibraryPhoto[]> {
  const uploads = await db.select({ id: media.id, filename: media.filename }).from(media).orderBy(desc(media.id));
  let files: string[] = [];
  try {
    files = (await readdir(DIR)).filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f)).sort();
  } catch {}
  return [
    ...uploads.map((u) => ({ src: `/media/${u.id}`, name: u.filename, uploaded: true })),
    ...files.map((f) => ({ src: `/photos/${f}`, name: f, uploaded: false })),
  ];
}
