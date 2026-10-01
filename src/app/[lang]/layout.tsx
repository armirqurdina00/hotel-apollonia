import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { marcellus, hanken } from "@/lib/fonts";
import { getDictionary, isLocale, LOCALES } from "@/i18n";
import { HOTEL, siteUrl } from "@/lib/hotel";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getSiteSettings } from "@/lib/settings";

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export const viewport: Viewport = { themeColor: "#0c3a27" };

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getDictionary(lang);
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t.meta.title, template: `%s | ${HOTEL.name}` },
    description: t.meta.description,
    alternates: {
      canonical: `/${lang}`,
      languages: Object.fromEntries(LOCALES.map((l) => [l, `/${l}`])),
    },
    openGraph: {
      type: "website",
      siteName: HOTEL.name,
      title: t.meta.title,
      description: t.meta.description,
      locale: lang,
      images: [{ url: "/photos/entrance.jpg", width: 2000, height: 1500 }],
    },
  };
}

export default async function LangLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const settings = await getSiteSettings();
  const { contact } = settings;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: HOTEL.name,
    url: `${siteUrl()}/${lang}`,
    telephone: contact.phone,
    email: contact.email,
    image: `${siteUrl()}/photos/entrance.jpg`,
    priceRange: "€€",
    checkinTime: HOTEL.checkInFrom,
    checkoutTime: HOTEL.checkOutUntil,
    address: {
      "@type": "PostalAddress",
      streetAddress: contact.street,
      addressLocality: contact.city,
      postalCode: contact.postalCode,
      addressCountry: HOTEL.countryCode,
    },
    geo: { "@type": "GeoCoordinates", latitude: HOTEL.geo.lat, longitude: HOTEL.geo.lng },
    amenityFeature: ["Free parking", "Restaurant", "Bar", "Conference room", "24-hour front desk", "Free Wi-Fi"].map((name) => ({
      "@type": "LocationFeatureSpecification",
      name,
      value: true,
    })),
    sameAs: [contact.instagram, contact.facebook].filter(Boolean),
  };

  return (
    <html lang={lang} data-scroll-behavior="smooth" className={`${marcellus.variable} ${hanken.variable}`}>
      <body className="min-h-dvh flex flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 btn btn-primary">
          {t.nav.skip}
        </a>
        <SiteHeader lang={lang} t={t} settings={settings} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter lang={lang} t={t} settings={settings} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </body>
    </html>
  );
}
