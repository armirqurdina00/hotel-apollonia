import type { MetadataRoute } from "next";
import { activeRooms } from "@/lib/engine";
import { LOCALES } from "@/i18n/config";
import { siteUrl } from "@/lib/hotel";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const rooms = await activeRooms();
  const paths = ["", "/rooms", ...rooms.map((r) => `/rooms/${r.slug}`)];
  return paths.flatMap((p) =>
    LOCALES.map((l) => ({
      url: `${base}/${l}${p}`,
      changeFrequency: "weekly" as const,
      priority: p === "" ? 1 : 0.8,
      alternates: { languages: Object.fromEntries(LOCALES.map((x) => [x, `${base}/${x}${p}`])) },
    })),
  );
}
