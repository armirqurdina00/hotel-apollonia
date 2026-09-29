import type { Metadata } from "next";
import "../globals.css";
import { marcellus, hanken } from "@/lib/fonts";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Apollonia admin" },
  robots: { index: false, follow: false },
};

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${marcellus.variable} ${hanken.variable}`}>
      <body className="min-h-dvh text-[0.9375rem]">{children}</body>
    </html>
  );
}
