import type { Metadata } from "next";
import "../globals.css";
import { marcellus, hanken } from "@/lib/fonts";
import { getAdminI18n } from "@/lib/admin";
import { AdminI18nProvider } from "@/components/admin/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAdminI18n();
  return {
    title: { default: "Apollonia", template: t.titleTemplate },
    robots: { index: false, follow: false },
  };
}

export default async function AdminRoot({ children }: { children: React.ReactNode }) {
  const { lang } = await getAdminI18n();
  return (
    <html lang={lang} className={`${marcellus.variable} ${hanken.variable}`}>
      <body className="min-h-dvh text-[0.9375rem]">
        <AdminI18nProvider lang={lang}>{children}</AdminI18nProvider>
      </body>
    </html>
  );
}
