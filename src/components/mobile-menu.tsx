"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function MobileMenu({ links, labels }: { links: { href: string; label: string }[]; labels: { open: string; close: string } }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <div className="xl:hidden">
      <button type="button" className="btn btn-ghost !min-h-11 !px-3 !py-2" onClick={() => setOpen(true)} aria-haspopup="dialog">
        {labels.open}
      </button>
      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        className="m-0 ml-auto h-dvh max-h-none w-[min(22rem,100vw)] crest p-6 backdrop:bg-black/40"
      >
        <div className="flex justify-end">
          <button type="button" className="btn btn-ghost !min-h-11" onClick={() => setOpen(false)}>
            {labels.close}
          </button>
        </div>
        <nav className="mt-8 flex flex-col gap-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="font-display text-2xl py-3 border-b border-white/10">
              {l.label}
            </Link>
          ))}
        </nav>
      </dialog>
    </div>
  );
}
