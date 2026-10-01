import "server-only";
import { cache } from "react";
import { db, siteSettings } from "@/db";
import { HOTEL } from "./hotel";

/** Contact details shown across the site, in emails and in Google's hotel data. */
export type Contact = {
  phone: string;
  barPhone: string;
  /** WhatsApp number; empty uses the reception phone. */
  whatsapp: string;
  email: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  instagram: string;
  facebook: string;
  /** What the map and "Get directions" search for. */
  mapsQuery: string;
};

/** Homepage photo slots, each a /photos/... or /media/... path. */
export const IMAGE_SLOTS = [
  "hero",
  "restaurantMain",
  "restaurantTop",
  "restaurantBottom",
  "restaurantWide",
  "meetings",
  "gjakovaMain",
  "gjakovaTop",
  "gjakovaBottom",
] as const;
export type ImageSlot = (typeof IMAGE_SLOTS)[number];
export type SiteImages = Record<ImageSlot, string>;

export const DEFAULT_CONTACT: Contact = {
  phone: HOTEL.phone,
  barPhone: HOTEL.barPhone,
  whatsapp: "",
  email: HOTEL.email,
  street: HOTEL.street,
  postalCode: HOTEL.postalCode,
  city: HOTEL.city,
  country: HOTEL.country,
  instagram: HOTEL.instagram,
  facebook: HOTEL.facebook,
  mapsQuery: HOTEL.mapsQuery,
};

export const DEFAULT_IMAGES: SiteImages = {
  hero: "/photos/terrace.jpg",
  restaurantMain: "/photos/restaurant.jpg",
  restaurantTop: "/photos/breakfast.jpg",
  restaurantBottom: "/photos/coffee.jpg",
  restaurantWide: "/photos/restaurant-hall.jpg",
  meetings: "/photos/dining-set.jpg",
  gjakovaMain: "/images/bazaar-shops.jpg",
  gjakovaTop: "/images/bazaar-restaurant.jpg",
  gjakovaBottom: "/images/bazaar-street.jpg",
};

/** "+383 45 97 67 47" → "tel:+38345976747". */
export const telHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, "")}`;
/** "+383 45 97 67 47" → "https://wa.me/38345976747". */
export const whatsappHref = (phone: string) => `https://wa.me/${phone.replace(/\D/g, "")}`;

/**
 * The website's current settings: saved values over the defaults. Read once
 * per request. If the table can't be read (e.g. before `npm run db:push` on a
 * new database) the site keeps working with the defaults.
 */
export const getSiteSettings = cache(async () => {
  let saved: Record<string, unknown> = {};
  try {
    saved = Object.fromEntries((await db.select().from(siteSettings)).map((r) => [r.key, r.value]));
  } catch (e) {
    console.error("[settings] using defaults:", e instanceof Error ? e.message : e);
  }
  const contact: Contact = { ...DEFAULT_CONTACT, ...(saved.contact as Partial<Contact> | undefined) };
  const images: SiteImages = { ...DEFAULT_IMAGES, ...(saved.images as Partial<SiteImages> | undefined) };
  return {
    contact,
    images,
    links: {
      phone: telHref(contact.phone),
      barPhone: telHref(contact.barPhone),
      whatsapp: whatsappHref(contact.whatsapp || contact.phone),
      maps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.mapsQuery)}`,
    },
  };
});

export type SiteSettings = Awaited<ReturnType<typeof getSiteSettings>>;
