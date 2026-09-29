"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Today" },
  { href: "/admin/bookings", label: "Bookings", badge: "bookings" },
  { href: "/admin/calendar", label: "Rates & availability" },
  { href: "/admin/rooms", label: "Room types" },
  { href: "/admin/inquiries", label: "Tables & meetings", badge: "inquiries" },
] as const;

export function AdminNav({ badges }: { badges: Record<string, number> }) {
  const path = usePathname();
  return (
    <nav className="flex lg:flex-col gap-1 shrink-0">
      {ITEMS.map((item) => {
        const active = item.href === "/admin" ? path === "/admin" : path.startsWith(item.href);
        const n = "badge" in item ? badges[item.badge] : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center justify-between gap-3 whitespace-nowrap rounded-[4px] px-3 py-2 ${active ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10"}`}
          >
            {item.label}
            {n > 0 && <span className="rounded-full bg-gold px-2 text-xs font-semibold text-ink">{n}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
