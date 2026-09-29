/**
 * Booking engine tests against a throwaway database.
 *   npm test
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { rmSync, mkdirSync } from "node:fs";

const DB = "file:./data/test.db";
process.env.DATABASE_URL = DB;
process.env.AUTH_SECRET ??= "test-secret-test-secret-test-secret";

before(() => {
  mkdirSync("data", { recursive: true });
  for (const f of ["data/test.db", "data/test.db-journal", "data/test.db-wal", "data/test.db-shm"]) rmSync(f, { force: true });
  execSync("npx drizzle-kit push --force", { env: { ...process.env, DATABASE_URL: DB }, stdio: "ignore" });
  execSync("npx tsx scripts/seed.ts", { env: { ...process.env, DATABASE_URL: DB }, stdio: "ignore" });
});

const engine = () => import("../src/lib/engine");
const dates = () => import("../src/lib/dates");

async function futureMonday(weeksAhead: number) {
  const { todayInGjakova, addDays, weekday } = await dates();
  let d = addDays(todayInGjakova(), weeksAhead * 7);
  while (weekday(d) !== 1) d = addDays(d, 1);
  return d;
}

const guest = { firstName: "Test", lastName: "Guest", email: "t@example.com", phone: "+38344000000" };

test("weekday price is the base rate, Friday and Saturday cost more", async () => {
  const { computeNightPrice } = await engine();
  const { addDays } = await dates();
  const mon = await futureMonday(2);
  const room = { basePriceCents: 4500 };
  const inSeason = (d: string) => ["07", "08"].includes(d.slice(5, 7)) || d.slice(5) >= "12-24" || d.slice(5) <= "01-02";
  if (inSeason(mon) || inSeason(addDays(mon, 4))) return; // season multipliers covered below
  assert.equal(computeNightPrice(room, mon), 4500);
  assert.equal(computeNightPrice(room, addDays(mon, 4)), 5000); // Friday: 49.50 rounds to 50
});

test("summer season applies and admin override wins", async () => {
  const { computeNightPrice } = await engine();
  assert.equal(computeNightPrice({ basePriceCents: 5000 }, "2027-07-13"), 6000); // Tuesday, +20%
  assert.equal(
    computeNightPrice({ basePriceCents: 5000 }, "2027-07-13", { id: 1, roomTypeId: 1, date: "2027-07-13", priceCents: 3900, blockedUnits: 0, closed: false }),
    3900,
  );
});

test("long stays get a discount", async () => {
  const { lengthOfStayDiscount } = await engine();
  assert.equal(lengthOfStayDiscount(3), 0);
  assert.equal(lengthOfStayDiscount(4), 0.05);
  assert.equal(lengthOfStayDiscount(10), 0.1);
});

test("validateStay rejects bad input", async () => {
  const { validateStay } = await engine();
  const mon = await futureMonday(1);
  assert.equal(validateStay({ checkIn: mon, checkOut: mon }).ok, false);
  assert.equal(validateStay({ checkIn: "2020-01-01", checkOut: "2020-01-02" }).ok, false);
  assert.equal(validateStay({ checkIn: "nope", checkOut: mon }).ok, false);
  assert.equal(validateStay({ checkIn: mon, checkOut: "2099-01-01" }).ok, false);
  const { addDays } = await dates();
  assert.equal(validateStay({ checkIn: mon, checkOut: addDays(mon, 3), adults: 2 }).ok, true);
  assert.equal(validateStay({ checkIn: mon, checkOut: addDays(mon, 3), adults: 0 }).ok, false);
});

test("cannot sell more rooms than exist, even with concurrent requests", async () => {
  const { activeRooms, createBooking, searchStays, SoldOutError } = await engine();
  const { addDays } = await dates();
  const family = (await activeRooms()).find((r) => r.slug === "family")!;
  const checkIn = await futureMonday(6);
  const stay = { checkIn, checkOut: addDays(checkIn, 2), adults: 2, children: 0, rooms: 1 };

  const attempts = await Promise.allSettled(
    Array.from({ length: family.inventory + 3 }, () => createBooking({ roomTypeId: family.id, stay, guest, locale: "en" })),
  );
  const ok = attempts.filter((a) => a.status === "fulfilled").length;
  const soldOut = attempts.filter((a) => a.status === "rejected" && a.reason instanceof SoldOutError).length;
  assert.equal(ok, family.inventory);
  assert.equal(soldOut, 3);

  const quotes = await searchStays(stay);
  const q = quotes.find((x) => x.room.slug === "family")!;
  assert.equal(q.bookable, false);
  assert.equal(q.minAvailable, 0);
});

test("a stay that only touches a full night on check-out day is still bookable", async () => {
  const { activeRooms, createBooking } = await engine();
  const { addDays } = await dates();
  const single = (await activeRooms()).find((r) => r.slug === "single")!;
  const d = await futureMonday(8);
  for (let i = 0; i < single.inventory; i++)
    await createBooking({ roomTypeId: single.id, stay: { checkIn: addDays(d, 2), checkOut: addDays(d, 4), adults: 1, children: 0, rooms: 1 }, guest, locale: "en" });
  const r = await createBooking({ roomTypeId: single.id, stay: { checkIn: d, checkOut: addDays(d, 2), adults: 1, children: 0, rooms: 1 }, guest, locale: "en" });
  assert.equal(r.booking.nights, 2);
});

test("party too large for a room type is refused", async () => {
  const { activeRooms, createBooking, SoldOutError } = await engine();
  const { addDays } = await dates();
  const single = (await activeRooms()).find((r) => r.slug === "single")!;
  const d = await futureMonday(10);
  await assert.rejects(
    createBooking({ roomTypeId: single.id, stay: { checkIn: d, checkOut: addDays(d, 1), adults: 2, children: 0, rooms: 1 }, guest, locale: "en" }),
    SoldOutError,
  );
});

test("cancellation window closes 48 hours before arrival day", async () => {
  const { cancellationOpen } = await engine();
  const arrival = "2030-06-10";
  const midnightKosovoSummer = Date.parse("2030-06-09T22:00:00Z");
  assert.equal(cancellationOpen(arrival, midnightKosovoSummer - 49 * 3600_000), true);
  assert.equal(cancellationOpen(arrival, midnightKosovoSummer - 47 * 3600_000), false);
});

test("booking tokens verify only for their own reference", async () => {
  const { bookingToken, verifyBookingToken } = await import("../src/lib/auth");
  const t = bookingToken("APL-AAAAAA");
  assert.equal(verifyBookingToken("APL-AAAAAA", t), true);
  assert.equal(verifyBookingToken("APL-BBBBBB", t), false);
  assert.equal(verifyBookingToken("APL-AAAAAA", null), false);
});

test("money formats consistently per language", async () => {
  const { formatMoney, formatDate } = await dates();
  assert.equal(formatMoney(4500, "en"), "€45");
  assert.equal(formatMoney(123400, "de"), "1.234 €");
  assert.equal(formatMoney(4500, "sq"), "45 €");
  assert.equal(formatDate("2026-10-10", "sq"), "Sht, 10 tet 2026");
  assert.equal(formatDate("2026-10-10", "de"), "Sa., 10. Okt. 2026");
});
