"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useState } from "react";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/config";
import { LanguageSwitcher } from "./language-switcher";

type Props = {
  lang: Locale;
  links: { href: string; label: string }[];
  book: { href: string; label: string };
  labels: { open: string; close: string; language: string; reception: string };
  phone: { label: string; href: string };
};

export function MobileMenu({ lang, links, book, labels, phone }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);

  return (
    <div className="xl:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={labels.open}
        className="grid size-11 place-items-center rounded-[var(--radius-soft)] border border-line text-forest hover:bg-mist"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {/* Headless UI portals this to the end of <body>, so the sticky header's
          backdrop blur can't change where the fixed panel sits (Safari does). */}
      <Dialog open={open} onClose={setOpen} className="relative z-50 xl:hidden">
        <DialogBackdrop transition className="fixed inset-0 bg-forest/50 backdrop-blur-sm transition-opacity duration-200 data-[closed]:opacity-0" />
        <div className="fixed inset-y-0 right-0 flex w-full sm:max-w-[24rem]">
          <DialogPanel
            transition
            aria-label={labels.open}
            className="crest relative flex h-dvh w-full flex-col overflow-y-auto px-6 pb-8 pt-4 text-white shadow-2xl transition-transform duration-200 ease-out data-[closed]:translate-x-full"
          >
            <div className="flex h-12 items-center justify-between">
              <Image src="/brand/emblem.png" alt="" width={502} height={379} className="h-10 w-auto" />
              <button
                type="button"
                onClick={close}
                aria-label={labels.close}
                className="grid size-11 place-items-center rounded-[var(--radius-soft)] border border-white/25 hover:bg-white/10"
              >
                <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            <nav className="mt-6 flex flex-col">
              {links.map((l) => {
                const current = pathname === l.href;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={close}
                    aria-current={current ? "page" : undefined}
                    className={`font-display text-[1.625rem] leading-tight py-3.5 border-b border-white/10 ${current ? "text-gold" : "hover:text-gold"}`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>

            <Link href={book.href} onClick={close} className="btn btn-gold mt-8 w-full">
              {book.label}
            </Link>

            <div className="mt-auto space-y-5 pt-8">
              <div>
                <p className="mb-2 text-sm text-white/60">{labels.language}</p>
                <Suspense>
                  <LanguageSwitcher lang={lang} label={labels.language} tone="dark" />
                </Suspense>
              </div>
              <div>
                <p className="text-sm text-white/60">{labels.reception}</p>
                <a href={phone.href} className="text-lg hover:text-gold">
                  {phone.label}
                </a>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
}
