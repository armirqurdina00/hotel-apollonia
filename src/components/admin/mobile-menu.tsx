"use client";

import Link from "next/link";
import { useState } from "react";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { useAdminI18n } from "./i18n";

/**
 * Phones and tablets: a top bar with the logo and a menu button that opens the
 * sidebar as a panel from the left. `children` is the same sidebar content the
 * desktop layout shows.
 */
export function AdminMobileMenu({ badge, children }: { badge: number; children: React.ReactNode }) {
  const { t } = useAdminI18n();
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <header className="crest sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3">
        <Link href="/admin" className="flex items-center gap-2 font-display text-lg tracking-[0.1em]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/emblem.png" alt="" className="h-9 w-auto" />
          APOLLONIA
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={badge ? `${t.nav.menu} (${badge})` : t.nav.menu}
          className="relative grid size-11 place-items-center rounded-[var(--radius-soft)] border border-white/25 hover:bg-white/10"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
          {badge > 0 && <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-gold px-1 text-xs font-semibold text-ink">{badge}</span>}
        </button>
      </header>

      <Dialog open={open} onClose={setOpen} className="relative z-50 lg:hidden">
        <DialogBackdrop transition className="fixed inset-0 bg-forest/50 backdrop-blur-sm transition-opacity duration-200 data-[closed]:opacity-0" />
        <div className="fixed inset-y-0 left-0 flex w-full max-w-[18rem]">
          <DialogPanel
            transition
            aria-label={t.nav.menu}
            // Picking a page (or signing out) closes the menu.
            onClickCapture={(e) => {
              if ((e.target as HTMLElement).closest("a, form button")) setOpen(false);
            }}
            className="crest flex h-dvh w-full flex-col gap-4 overflow-y-auto p-4 text-white shadow-2xl transition-transform duration-200 ease-out data-[closed]:-translate-x-full"
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-display text-lg tracking-[0.1em]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/emblem.png" alt="" className="h-9 w-auto" />
                APOLLONIA
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t.nav.close}
                className="grid size-11 place-items-center rounded-[var(--radius-soft)] border border-white/25 hover:bg-white/10"
              >
                <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            {children}
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
}
