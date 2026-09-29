import Link from "next/link";
import type { Dictionary, Locale } from "@/i18n";
import { HOTEL } from "@/lib/hotel";
import { LogoOnDark } from "./site-header";

export function SiteFooter({ lang, t }: { lang: Locale; t: Dictionary }) {
  return (
    <footer className="crest mt-24 border-t-4 border-gold">
      <div className="wrap py-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <LogoOnDark />
          <p className="mt-5 text-sm text-white/70">
            {HOTEL.street}
            <br />
            {HOTEL.postalCode} {HOTEL.city}, {HOTEL.country}
          </p>
        </div>
        <div>
          <h2 className="font-sans font-semibold text-base mb-3">{t.footer.contact}</h2>
          <dl className="text-sm space-y-2">
            <div>
              <dt className="text-white/60">{t.footer.reception}</dt>
              <dd>
                <a href={HOTEL.phoneHref} className="hover:underline">
                  {HOTEL.phone}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-white/60">{t.footer.bar}</dt>
              <dd>
                <a href={HOTEL.barPhoneHref} className="hover:underline">
                  {HOTEL.barPhone}
                </a>
              </dd>
            </div>
          </dl>
        </div>
        <div>
          <h2 className="font-sans font-semibold text-base mb-3">{t.nav.book}</h2>
          <ul className="text-sm space-y-2">
            <li>
              <Link href={`/${lang}/rooms`} className="hover:underline">
                {t.nav.rooms}
              </Link>
            </li>
            <li>
              <Link href={`/${lang}/book`} className="hover:underline">
                {t.search.submit}
              </Link>
            </li>
            <li>
              <Link href={`/${lang}/booking`} className="hover:underline">
                {t.nav.manage}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="font-sans font-semibold text-base mb-3">{t.footer.follow}</h2>
          <ul className="text-sm space-y-2">
            <li>
              <a href={HOTEL.instagram} className="hover:underline" rel="noopener" target="_blank">
                Instagram
              </a>
            </li>
            <li>
              <a href={HOTEL.facebook} className="hover:underline" rel="noopener" target="_blank">
                Facebook
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="wrap pb-8 text-xs text-white/50">
        © {new Date().getFullYear()} {t.footer.rights}
      </div>
    </footer>
  );
}
