/**
 * Facts about the hotel. Everything a guest reads about policies, contact
 * details and prices comes from here or from the database, so the owners
 * only have one place to correct.
 *
 * TODO(owner): confirm the values marked "confirm".
 */
export const HOTEL = {
  name: "Hotel Apollonia",
  legalName: "Hotel Apollonia",
  street: "Rruga Tirana", // confirm house number
  city: "Gjakovë",
  postalCode: "50000",
  country: "Kosovo",
  countryCode: "XK",
  phone: "+383 45 97 67 47",
  phoneHref: "tel:+38345976747",
  barPhone: "+383 43 97 67 47",
  barPhoneHref: "tel:+38343976747",
  whatsappHref: "https://wa.me/38345976747",
  email: "info@hotelapollonia.com", // confirm
  instagram: "https://www.instagram.com/hotelapolloniagjk/",
  facebook: "https://www.facebook.com/hotelapollonia91/",
  geo: { lat: 42.3803, lng: 20.4308 }, // confirm exact pin
  mapsQuery: "Hotel Apollonia, Gjakova, Kosovo",
  checkInFrom: "14:00", // confirm
  checkOutUntil: "11:00", // confirm
  /** Free cancellation until this many hours before check-in day starts. */
  freeCancellationHours: 48,
  guestRating: { score: 9.1, source: "Booking.com", reviews: 69 }, // September 2026
  currency: "EUR",
  maxNights: 30,
  bookingWindowDays: 365,
} as const;

/**
 * Pricing rules applied on top of each room's base rate. Admin day overrides
 * replace the computed price for that date.
 */
export const PRICING = {
  /** Friday and Saturday nights. */
  weekendMultiplier: 1.1,
  seasons: [
    // Summer: diaspora visits and weddings.
    { from: "07-01", to: "08-31", multiplier: 1.2 },
    // New Year.
    { from: "12-24", to: "01-02", multiplier: 1.15 },
  ],
  /** Discount for long stays, by minimum number of nights. */
  lengthOfStay: [
    { minNights: 7, discount: 0.1 },
    { minNights: 4, discount: 0.05 },
  ],
} as const;

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
