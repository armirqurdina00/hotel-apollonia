# Hotel Apollonia, Gjakova

Booking website for Hotel Apollonia: public site in Albanian, English and German, direct booking with live availability, and a staff panel.

## Run it

```bash
cp .env.example .env.local   # then set ADMIN_PASSWORD and AUTH_SECRET
npm install
npm run setup                # creates the database, room types and demo bookings
npm run dev
```

- Website: http://localhost:3000 (redirects to /sq, /en or /de from the browser language)
- Staff panel: http://localhost:3000/admin (password from `ADMIN_PASSWORD`)
- Tests: `npm test` (booking engine: pricing, availability, overbooking under concurrent requests)

## What guests can do

- Search dates and guests and see every room type with its total price, including long-stay discounts.
- Open a room and pick dates on a live price calendar that shows each night's price and fully booked days.
- Book without a card (pay at the hotel). They get a confirmation page and an email with a private link, an .ics calendar file, and free cancellation until 48 hours before arrival.
- Find a booking by number and email.
- Request a restaurant table or ask about the conference room.

## What staff can do (/admin)

- **Today:** arrivals, departures, guests in house, occupancy for the next 14 nights, and room revenue this month.
- **Bookings:** search and filter, then confirm, check in, check out, mark no-show or cancel. Add staff notes. Add phone, walk-in and Booking.com bookings. Every booking goes through the same availability check, so rooms can't be double-sold.
- **Rates & availability:** a grid of room types by day. Set a price, hold rooms back (for example rooms sold on Booking.com), or stop sales for any date range.
- **Room types:** base price, number of rooms, on/off sale.
- **Tables & meetings:** requests from the website.

## Pricing rules

In `src/lib/hotel.ts`: weekend +10% (Fri/Sat), July–August +20%, New Year +15%, 5% off 4+ nights and 10% off 7+ nights. Staff day prices override these.

## Stack

Next.js 16 (App Router, server actions, proxy), React 19, Tailwind CSS 4, Drizzle ORM on SQLite/libSQL, Zod, Resend for email (optional; without a key, emails are printed to the server log).

## Deploying

Vercel has no persistent disk, so use a hosted libSQL database (Turso, free tier):

1. `turso db create apollonia` and `turso db tokens create apollonia`
2. In `vercel.json` the functions run in `dub1` (Dublin), next to the database in `aws-eu-west-1`. Set `DATABASE_URL=libsql://...` and `DATABASE_AUTH_TOKEN=...`, plus `AUTH_SECRET`, `ADMIN_PASSWORD`, `NEXT_PUBLIC_SITE_URL`, and optionally `RESEND_API_KEY`, `EMAIL_FROM`, `HOTEL_NOTIFY_EMAIL`.
3. `npm run db:push && npm run db:seed` against that database, then deploy.

On a VPS, the default `file:` SQLite database works as is.

## To confirm with the owners

Search `confirm` in `src/lib/hotel.ts` and check `scripts/seed.ts`:

- Room types, sizes, bed setups, room counts and prices. These are placeholders; the Booking.com listing doesn't show room types without a live search.
- Which photo belongs to which room type, and where the jacuzzi room (`public/photos/jacuzzi.jpg`) fits.
- Street number, map pin, email, check-in/out times, restaurant and bar hours.
- Whether breakfast is included in every direct rate. The site currently says it is.
- Whether the conference room has a projector and screen (the text says so).

## Photos

- `public/photos`: the hotel's own photos from its public Facebook page, with the watermark cropped out.
- `public/brand`: the logo, emblem and wordmark, cut from the official logo.
- `public/images/bazaar-*`: Old Bazaar of Gjakova, Wikimedia Commons, CC0.
