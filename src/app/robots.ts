import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/hotel";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/*/booking/", "/*/book/"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
