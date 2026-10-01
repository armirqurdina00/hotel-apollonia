import { sql } from "drizzle-orm";
import { blob, integer, sqliteTable, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";

/** Text in every site language. */
export type Localized = { sq: string; en: string; de: string };

export const roomTypes = sqliteTable("room_types", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name", { mode: "json" }).$type<Localized>().notNull(),
  summary: text("summary", { mode: "json" }).$type<Localized>().notNull(),
  description: text("description", { mode: "json" }).$type<Localized>().notNull(),
  bed: text("bed", { mode: "json" }).$type<Localized>().notNull(),
  sizeM2: integer("size_m2").notNull(),
  maxAdults: integer("max_adults").notNull(),
  maxChildren: integer("max_children").notNull().default(0),
  /** Number of physical rooms of this type. */
  inventory: integer("inventory").notNull(),
  /** Weekday nightly rate in euro cents, breakfast included. */
  basePriceCents: integer("base_price_cents").notNull(),
  images: text("images", { mode: "json" }).$type<string[]>().notNull(),
  amenities: text("amenities", { mode: "json" }).$type<string[]>().notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

/**
 * Photos uploaded from the admin panel, served at /media/{id}. Kept in the
 * database because Vercel has no disk; the browser shrinks them before upload.
 */
export const media = sqliteTable("media", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  contentType: text("content_type").notNull(),
  data: blob("data", { mode: "buffer" }).notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  filename: text("filename").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/**
 * Website settings staff can change in the admin panel (contact details,
 * homepage photos), one JSON value per key. Anything missing falls back to
 * the defaults in src/lib/settings.ts.
 */
export const siteSettings = sqliteTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull(),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/** Per-date adjustments set from the admin calendar. */
export const dayOverrides = sqliteTable(
  "day_overrides",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    roomTypeId: integer("room_type_id")
      .notNull()
      .references(() => roomTypes.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD
    priceCents: integer("price_cents"),
    /** Rooms held back from online sale (maintenance, groups, OTAs). */
    blockedUnits: integer("blocked_units").notNull().default(0),
    closed: integer("closed", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [uniqueIndex("day_override_room_date").on(t.roomTypeId, t.date)],
);

export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "checked_in",
  "checked_out",
  "cancelled",
  "no_show",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];
/** Statuses that hold a room. */
export const HOLDING_STATUSES: BookingStatus[] = ["pending", "confirmed", "checked_in"];

export const bookings = sqliteTable(
  "bookings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ref: text("ref").notNull().unique(),
    roomTypeId: integer("room_type_id")
      .notNull()
      .references(() => roomTypes.id),
    checkIn: text("check_in").notNull(),
    checkOut: text("check_out").notNull(),
    nights: integer("nights").notNull(),
    rooms: integer("rooms").notNull().default(1),
    adults: integer("adults").notNull(),
    children: integer("children").notNull().default(0),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    country: text("country"),
    arrivalTime: text("arrival_time"),
    notes: text("notes"),
    parking: integer("parking", { mode: "boolean" }).notNull().default(false),
    totalCents: integer("total_cents").notNull(),
    nightly: text("nightly", { mode: "json" }).$type<{ date: string; cents: number }[]>().notNull(),
    locale: text("locale").notNull().default("sq"),
    status: text("status").$type<BookingStatus>().notNull().default("pending"),
    source: text("source").$type<"web" | "phone" | "walk_in" | "ota">().notNull().default("web"),
    internalNote: text("internal_note"),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
    updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [index("bookings_dates").on(t.roomTypeId, t.checkIn, t.checkOut), index("bookings_status").on(t.status)],
);

export const inquiries = sqliteTable("inquiries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kind: text("kind").$type<"table" | "meeting" | "contact">().notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  date: text("date"),
  time: text("time"),
  people: integer("people"),
  message: text("message"),
  locale: text("locale").notNull().default("sq"),
  status: text("status").$type<"new" | "handled">().notNull().default("new"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export type RoomType = typeof roomTypes.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Inquiry = typeof inquiries.$inferSelect;
export type DayOverride = typeof dayOverrides.$inferSelect;
