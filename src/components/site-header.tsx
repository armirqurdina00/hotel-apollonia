import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import type { Dictionary, Locale } from "@/i18n";
import { LanguageSwitcher } from "./language-switcher";
import { MobileMenu } from "./mobile-menu";
import type { SiteSettings } from "@/lib/settings";

/** The hotel's crest and wordmark, as on the sign above the entrance. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <Image src="/brand/emblem.png" alt="" width={502} height={379} priority className="h-11 w-auto" />
      <Image src="/brand/wordmark.png" alt="Hotel Apollonia" width={845} height={141} priority className="h-[15px] w-auto sm:h-[17px]" />
    </span>
  );
}

/** For dark backgrounds, where the green lettering would disappear. */
export function LogoOnDark({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-3 ${className}`}>
      <Image src="/brand/emblem.png" alt="" width={502} height={379} className="h-14 w-auto" />
      <span className="font-display text-xl tracking-[0.12em] text-white">HOTEL APOLLONIA</span>
    </span>
  );
}

export function SiteHeader({ lang, t, settings }: { lang: Locale; t: Dictionary; settings: SiteSettings }) {
  const links = [
    { href: `/${lang}/rooms`, label: t.nav.rooms },
    { href: `/${lang}#restaurant`, label: t.nav.restaurant },
    { href: `/${lang}#meetings`, label: t.nav.meetings },
    { href: `/${lang}#location`, label: t.nav.location },
  ];
  return (
    <header className="border-b border-line bg-canvas/95 backdrop-blur supports-[backdrop-filter]:bg-canvas/85 sticky top-0 z-30">
      <div className="wrap flex items-center gap-3 sm:gap-6 h-16 sm:h-18">
        <Link href={`/${lang}`} className="shrink-0" aria-label="Hotel Apollonia">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden xl:flex items-center gap-6 ml-2 text-[0.9375rem] whitespace-nowrap">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-emerald underline-offset-4 hover:underline">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <Link href={`/${lang}/booking`} className="hidden lg:inline whitespace-nowrap text-[0.9375rem] hover:text-emerald hover:underline underline-offset-4">
            {t.nav.manage}
          </Link>
          <div className="hidden sm:block">
            <Suspense>
              <LanguageSwitcher lang={lang} label={t.nav.language} />
            </Suspense>
          </div>
          <Link href={`/${lang}/book`} className="btn btn-primary hidden min-[400px]:inline-flex whitespace-nowrap !min-h-11 !py-2 !px-4 sm:!px-5">
            {t.nav.book}
          </Link>
          <MobileMenu
            lang={lang}
            links={[...links, { href: `/${lang}/booking`, label: t.nav.manage }]}
            book={{ href: `/${lang}/book`, label: t.nav.book }}
            labels={{ open: t.nav.menu, close: t.nav.close, language: t.nav.language, reception: t.footer.reception }}
            phone={{ label: settings.contact.phone, href: settings.links.phone }}
          />
        </div>
      </div>
    </header>
  );
}
