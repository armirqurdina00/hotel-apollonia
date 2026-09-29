import "server-only";
import { and, asc, eq, gte, inArray, lt, gt } from "drizzle-orm";
import { db, bookings, dayOverrides, roomTypes, HOLDING_STATUSES, type RoomType, type DayOverride } from "@/db";
import { HOTEL, PRICING } from "./hotel";
import { addDays, diffDays, isISODate, nightsBetween, parse, todayInGjakova, weekday, type ISODate } from "./dates";

export type NightInfo = {
  date: ISODate;
  priceCents: number;
  /** Rooms of this type still sellable for this night. */
  available: number;
  closed: boolean;
};

export type Quote = {
  room: RoomType;
  rooms: number;
  nights: NightInfo[];
  subtotalCents: number;
  discountCents: number;
  discountRate: number;
  totalCents: number;
  /** Smallest number of rooms free across all nights. */
  minAvailable: number;
  bookable: boolean;
  fitsParty: boolean;
};

function seasonMultiplier(date: ISODate): number {
  const md = date.slice(5);
  for (const s of PRICING.seasons) {
    const inSeason = s.from <= s.to ? md >= s.from && md <= s.to : md >= s.from || md <= s.to;
    if (inSeason) return s.multiplier;
  }
  return 1;
}

/** Nightly price, rounded to whole euros so guests see clean numbers. */
export function computeNightPrice(room: Pick<RoomType, "basePriceCents">, date: ISODate, override?: DayOverride) {
  if (override?.priceCents != null) return override.priceCents;
  const dow = weekday(date);
  const weekend = dow === 5 || dow === 6 ? PRICING.weekendMultiplier : 1;
  const raw = room.basePriceCents * weekend * seasonMultiplier(date);
  return Math.round(raw / 100) * 100;
}

export function lengthOfStayDiscount(nights: number): number {
  for (const r of PRICING.lengthOfStay) if (nights >= r.minNights) return r.discount;
  return 0;
}

/**
 * Availability and price for every night in [from, to) for the given room
 * types. One query for bookings, one for overrides.
 */
type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function nightlyGrid(
  rooms: RoomType[],
  from: ISODate,
  to: ISODate,
  opts: { excludeBookingId?: number; tx?: Executor } = {},
) {
  const { excludeBookingId, tx: q = db } = opts;
  const ids = rooms.map((r) => r.id);
  if (!ids.length) return new Map<number, NightInfo[]>();

  const [held, overrides] = await Promise.all([
    q
      .select({
        id: bookings.id,
        roomTypeId: bookings.roomTypeId,
        checkIn: bookings.checkIn,
        checkOut: bookings.checkOut,
        rooms: bookings.rooms,
      })
      .from(bookings)
      .where(
        and(
          inArray(bookings.roomTypeId, ids),
          inArray(bookings.status, HOLDING_STATUSES),
          lt(bookings.checkIn, to),
          gt(bookings.checkOut, from),
        ),
      ),
    q
      .select()
      .from(dayOverrides)
      .where(and(inArray(dayOverrides.roomTypeId, ids), gte(dayOverrides.date, from), lt(dayOverrides.date, to))),
  ]);

  const ovr = new Map(overrides.map((o) => [`${o.roomTypeId}:${o.date}`, o]));
  const dates = nightsBetween(from, to);
  const grid = new Map<number, NightInfo[]>();

  for (const room of rooms) {
    const mine = held.filter((b) => b.roomTypeId === room.id && b.id !== excludeBookingId);
    grid.set(
      room.id,
      dates.map((date) => {
        const o = ovr.get(`${room.id}:${date}`);
        const taken = mine.reduce((n, b) => (b.checkIn <= date && date < b.checkOut ? n + b.rooms : n), 0);
        const closed = !room.active || Boolean(o?.closed);
        const available = closed ? 0 : Math.max(0, room.inventory - taken - (o?.blockedUnits ?? 0));
        return { date, priceCents: computeNightPrice(room, date, o), available, closed };
      }),
    );
  }
  return grid;
}

export type StayQuery = {
  checkIn: ISODate;
  checkOut: ISODate;
  adults: number;
  children: number;
  rooms: number;
};

export type StayQueryError = "dates" | "past" | "too_long" | "too_far" | "party";

export function validateStay(q: Partial<Record<keyof StayQuery, unknown>>): { ok: true; value: StayQuery } | { ok: false; error: StayQueryError } {
  const checkIn = q.checkIn,
    checkOut = q.checkOut;
  if (!isISODate(checkIn) || !isISODate(checkOut) || checkOut <= checkIn) return { ok: false, error: "dates" };
  const today = todayInGjakova();
  if (checkIn < today) return { ok: false, error: "past" };
  if (diffDays(checkIn, checkOut) > HOTEL.maxNights) return { ok: false, error: "too_long" };
  if (diffDays(today, checkIn) > HOTEL.bookingWindowDays) return { ok: false, error: "too_far" };
  const adults = Number(q.adults ?? 2),
    children = Number(q.children ?? 0),
    rooms = Number(q.rooms ?? 1);
  if (![adults, children, rooms].every(Number.isInteger) || adults < 1 || adults > 12 || children < 0 || children > 8 || rooms < 1 || rooms > 5)
    return { ok: false, error: "party" };
  return { ok: true, value: { checkIn, checkOut, adults, children, rooms } };
}

function buildQuote(room: RoomType, nights: NightInfo[], q: StayQuery): Quote {
  const perRoom = nights.reduce((s, n) => s + n.priceCents, 0);
  const subtotalCents = perRoom * q.rooms;
  const discountRate = lengthOfStayDiscount(nights.length);
  const discountCents = Math.round((subtotalCents * discountRate) / 100) * 100;
  const minAvailable = Math.min(...nights.map((n) => n.available));
  const fitsParty =
    q.adults <= room.maxAdults * q.rooms &&
    q.adults + q.children <= (room.maxAdults + room.maxChildren) * q.rooms &&
    q.adults >= q.rooms;
  return {
    room,
    rooms: q.rooms,
    nights,
    subtotalCents,
    discountCents,
    discountRate,
    totalCents: subtotalCents - discountCents,
    minAvailable,
    bookable: minAvailable >= q.rooms && fitsParty,
    fitsParty,
  };
}

export async function activeRooms() {
  return db.select().from(roomTypes).where(eq(roomTypes.active, true)).orderBy(asc(roomTypes.sortOrder));
}

export async function roomBySlug(slug: string) {
  const [room] = await db.select().from(roomTypes).where(eq(roomTypes.slug, slug)).limit(1);
  return room?.active ? room : undefined;
}

/** Quotes for every active room type, bookable ones first. */
export async function searchStays(q: StayQuery) {
  const rooms = await activeRooms();
  const grid = await nightlyGrid(rooms, q.checkIn, q.checkOut);
  return rooms
    .map((r) => buildQuote(r, grid.get(r.id)!, q))
    .sort((a, b) => Number(b.bookable) - Number(a.bookable) || a.room.sortOrder - b.room.sortOrder);
}

export async function quoteRoom(room: RoomType, q: StayQuery) {
  const grid = await nightlyGrid([room], q.checkIn, q.checkOut);
  return buildQuote(room, grid.get(room.id)!, q);
}

/** Lowest nightly price over the next few weeks, for "from €X" labels. */
export async function fromPrices(rooms: RoomType[]) {
  const today = todayInGjakova();
  const grid = await nightlyGrid(rooms, today, addDays(today, 60));
  const out = new Map<number, number>();
  for (const r of rooms) {
    const open = grid.get(r.id)!.filter((n) => n.available > 0);
    out.set(r.id, open.length ? Math.min(...open.map((n) => n.priceCents)) : r.basePriceCents);
  }
  return out;
}

const REF_ALPHABET = "ACDEFGHJKLMNPQRTUVWXY34679";
export function newBookingRef() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return "APL-" + Array.from(bytes, (b) => REF_ALPHABET[b % REF_ALPHABET.length]).join("");
}

export type GuestDetails = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country?: string | null;
  arrivalTime?: string | null;
  notes?: string | null;
  parking?: boolean;
};

export class SoldOutError extends Error {
  constructor() {
    super("sold_out");
  }
}

/**
 * Re-checks availability and inserts the booking inside one write
 * transaction. SQLite/libSQL serialises writers, so two guests racing for the
 * last room cannot both succeed.
 */
function isBusy(e: unknown) {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === "SQLITE_BUSY" || err?.cause?.code === "SQLITE_BUSY";
}

/** Retries a write transaction while another booking holds the lock. */
async function withWriteLock<T>(fn: () => Promise<T>, attempts = 12): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (!isBusy(e) || i >= attempts - 1) throw e;
      await new Promise((r) => setTimeout(r, 15 * 2 ** Math.min(i, 5) + Math.random() * 25));
    }
  }
}

export async function createBooking(input: {
  roomTypeId: number;
  stay: StayQuery;
  guest: GuestDetails;
  locale: string;
  status?: "pending" | "confirmed";
  source?: "web" | "phone" | "walk_in" | "ota";
  internalNote?: string | null;
}) {
  return withWriteLock(() => db.transaction(
    async (tx) => {
      const [room] = await tx.select().from(roomTypes).where(eq(roomTypes.id, input.roomTypeId)).limit(1);
      if (!room || !room.active) throw new SoldOutError();
      const grid = await nightlyGrid([room], input.stay.checkIn, input.stay.checkOut, { tx });
      const quote = buildQuote(room, grid.get(room.id)!, input.stay);
      if (!quote.fitsParty || !quote.bookable) throw new SoldOutError();

      const ref = newBookingRef();
      const [created] = await tx
        .insert(bookings)
        .values({
          ref,
          roomTypeId: room.id,
          checkIn: input.stay.checkIn,
          checkOut: input.stay.checkOut,
          nights: quote.nights.length,
          rooms: input.stay.rooms,
          adults: input.stay.adults,
          children: input.stay.children,
          ...input.guest,
          parking: Boolean(input.guest.parking),
          totalCents: quote.totalCents,
          nightly: quote.nights.map((n) => ({ date: n.date, cents: n.priceCents })),
          locale: input.locale,
          status: input.status ?? "confirmed",
          source: input.source ?? "web",
          internalNote: input.internalNote ?? null,
        })
        .returning();
      return { booking: created, room, quote };
    },
    { behavior: "immediate" },
  ));
}

/**
 * Free cancellation ends N hours before midnight at the start of the arrival
 * day, hotel time. Kosovo is UTC+1 or UTC+2; we use the earlier of the two.
 */
export function cancellationOpen(checkIn: ISODate, now = Date.now()) {
  const arrivalMidnight = parse(checkIn).getTime() - 2 * 3600_000;
  return now < arrivalMidnight - HOTEL.freeCancellationHours * 3600_000;
}
