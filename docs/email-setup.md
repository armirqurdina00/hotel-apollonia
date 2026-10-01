# Email setup

The site sends email through [Resend](https://resend.com). Without the settings below it still works, but emails are only printed to the server log instead of being sent.

## What gets sent

| When | Guest gets (in their language) | Hotel gets (in Albanian) |
|---|---|---|
| Guest books on the website | Booking confirmation with a "view or cancel" link | "Rezervim i ri" with the guest's contact details |
| Staff confirm a pending booking | "The hotel confirmed your booking" | – |
| Guest cancels | Cancellation notice | "Rezervim i anuluar" |
| Staff cancel | Cancellation notice | – |
| Table or conference request | "We received your request" (only if they gave an email) | The request, with a link to the admin panel |

Phone and walk-in bookings entered by staff email the guest only if "Email the confirmation" is ticked, and never email the hotel. Replying to a hotel email writes straight to the guest.

## Settings

| Name | Example | What it does |
|---|---|---|
| `RESEND_API_KEY` | `re_xxxxxxxx` | Turns sending on. Without it, emails go to the server log. |
| `EMAIL_FROM` | `Hotel Apollonia <rezervime@hotel-apollonia.com>` | The sender. Its domain must be verified in Resend. |
| `HOTEL_NOTIFY_EMAIL` | `reception@gmail.com, owner@gmail.com` | Where the hotel's notices go. Separate several addresses with commas. |
| `EMAIL_REPLY_TO` | `apollonia.hotel@gmail.com` | Where guests' replies go. Optional; defaults to the sender. |
| `NEXT_PUBLIC_SITE_URL` | `https://hotel-apollonia.com` | Used for links and the logo in emails. Must be the real public address. |

## Going live on Vercel

1. **Create a Resend account** at resend.com. The free plan covers 3,000 emails a month (100 a day).
2. **Add your domain in Resend:** Domains → Add domain → enter the domain (e.g. `hotel-apollonia.com`) → region **Ireland (eu-west-1)**.
3. **Add the DNS records Resend shows** (usually an MX record and two TXT records for SPF and DKIM) wherever the domain's DNS is managed (Cloudflare, Porkbun, …). Then click **Verify** in Resend. This takes minutes, sometimes a few hours.
4. **Create an API key:** API Keys → Create → "Sending access", limited to that domain. Copy it.
5. **Add the settings in Vercel:** your project → Settings → Environment Variables. Tick **Production** and add the five settings from the table above.
6. **Redeploy:** Deployments → latest deployment → ⋯ → **Redeploy**. Settings only apply after a deploy.
7. **Test:** book a room on the live site with your own email, and send a table request. If nothing arrives, check spam, then Resend → **Emails**, which lists every send and any error.

### Receiving replies

Resend only sends. Guests can reply to the emails, so the reply address must be a mailbox someone reads:

- set `EMAIL_REPLY_TO` to an inbox you already use (e.g. a Gmail), or
- forward the domain's address to it for free, e.g. with Cloudflare Email Routing (`rezervime@hotel-apollonia.com` → your Gmail).

## Testing before you have a domain

Resend lets you send without a verified domain, from `onboarding@resend.dev`, but **only to the email address you signed up to Resend with**. That's enough to see every email for real.

1. Sign up at resend.com and create an API key.
2. In `.env.local` (to test on your computer) or in Vercel's Environment Variables (to test the live site):
   ```
   RESEND_API_KEY=re_xxxxxxxx
   EMAIL_FROM=
   HOTEL_NOTIFY_EMAIL=you@example.com
   ```
   Leave `EMAIL_FROM` empty so the default `onboarding@resend.dev` is used, and set `HOTEL_NOTIFY_EMAIL` to your Resend sign-up address.
3. Restart `npm run dev` (or redeploy on Vercel).
4. Book a room and send a table or conference request **using your Resend sign-up address as the guest email**. You receive both the guest's email and the hotel's notice.

Emails to any other address are rejected until the domain is verified; Resend → Emails shows that as an error. Once the domain is verified, set `EMAIL_FROM` and the real `HOTEL_NOTIFY_EMAIL` and redeploy.
