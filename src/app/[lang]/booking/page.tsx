import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "@/i18n";
import { FindBookingForm } from "@/components/booking-client";

export async function generateMetadata({ params }: PageProps<"/[lang]/booking">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getDictionary(lang).manage.title, robots: { index: false } };
}

export default async function FindBookingPage({ params }: PageProps<"/[lang]/booking">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  return (
    <div className="wrap pt-14 max-w-xl">
      <h1 className="text-4xl sm:text-5xl">{t.manage.title}</h1>
      <p className="mt-4 mb-8 text-muted">{t.manage.lead}</p>
      <FindBookingForm lang={lang} labels={t.manage} />
    </div>
  );
}
