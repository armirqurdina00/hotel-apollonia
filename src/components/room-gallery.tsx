"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

type Labels = {
  showPhotos: string;
  openPhoto: string;
  close: string;
  prev: string;
  next: string;
  count: string;
};

const fill = (s: string, v: Record<string, number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

export function RoomGallery({ images, alt, labels }: { images: string[]; alt: string; labels: Labels }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState<number | null>(null);
  const open = index !== null;
  const total = images.length;

  const show = (i: number) => {
    setIndex(i);
    dialog.current?.showModal();
  };
  const go = useCallback((by: number) => setIndex((i) => (i === null ? i : (i + by + total) % total)), [total]);

  // Keep the page behind from scrolling while the gallery is open.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = prev;
    };
  }, [open]);

  // Keep the active thumbnail in view.
  useEffect(() => {
    if (index === null) return;
    dialog.current?.querySelector(`[data-thumb="${index}"]`)?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [index]);

  const touch = useRef<{ x: number; y: number } | null>(null);
  const rest = images.slice(1, 3);
  const hidden = total - 1 - rest.length;

  return (
    <>
      <div className="grid grid-cols-3 gap-3 content-start">
        <button
          type="button"
          onClick={() => show(0)}
          aria-label={fill(labels.openPhoto, { n: 1 })}
          className={`group relative ${total > 1 ? "col-span-2" : "col-span-3"} row-span-2 aspect-[4/5] overflow-hidden rounded-[var(--radius-soft)] cursor-zoom-in`}
        >
          <Image src={images[0]} alt={alt} fill priority sizes="(min-width: 1024px) 38vw, 66vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full bg-white/95 px-3.5 py-2 text-sm font-semibold text-ink shadow-[0_4px_16px_-6px_rgb(0_0_0/0.4)]">
            <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 fill-none stroke-current [stroke-width:1.6]">
              <rect x="1.5" y="1.5" width="5" height="5" rx="1" />
              <rect x="9.5" y="1.5" width="5" height="5" rx="1" />
              <rect x="1.5" y="9.5" width="5" height="5" rx="1" />
              <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
            </svg>
            {labels.showPhotos}
          </span>
        </button>
        {rest.map((src, i) => {
          const n = i + 1;
          const more = n === rest.length && hidden > 0;
          return (
            <button
              key={src}
              type="button"
              onClick={() => show(n)}
              aria-label={fill(labels.openPhoto, { n: n + 1 })}
              className="group relative overflow-hidden rounded-[var(--radius-soft)] cursor-zoom-in"
            >
              <Image src={src} alt="" fill sizes="(min-width: 1024px) 19vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
              {more && <span className="absolute inset-0 grid place-items-center bg-forest/55 text-2xl font-semibold text-white">+{hidden}</span>}
            </button>
          );
        })}
      </div>

      <dialog
        ref={dialog}
        aria-label={alt}
        onClose={() => setIndex(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(1);
          if (e.key === "ArrowLeft") go(-1);
        }}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-[#0b120e] p-0 text-white backdrop:bg-black/90 open:flex open:flex-col"
      >
        {open && (
          <>
            <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
              <p className="text-sm tabular-nums text-white/75" aria-live="polite">
                {fill(labels.count, { n: index + 1, total })}
              </p>
              <p className="hidden truncate font-serif text-lg sm:block">{alt}</p>
              <button type="button" onClick={() => dialog.current?.close()} aria-label={labels.close} className="grid size-11 place-items-center rounded-full hover:bg-white/10" autoFocus>
                <svg viewBox="0 0 16 16" aria-hidden="true" className="size-5 fill-none stroke-current [stroke-linecap:round] [stroke-width:1.8]">
                  <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
                </svg>
              </button>
            </div>

            <div
              className="relative min-h-0 flex-1 select-none"
              onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
              onTouchEnd={(e) => {
                const start = touch.current;
                touch.current = null;
                if (!start) return;
                const dx = e.changedTouches[0].clientX - start.x;
                const dy = e.changedTouches[0].clientY - start.y;
                if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
              }}
            >
              {/* Current photo plus its neighbours, so stepping through feels instant. */}
              {[-1, 0, 1].map((offset) => {
                if (total < 2 && offset !== 0) return null;
                const i = (index + offset + total) % total;
                return (
                  <Image
                    key={`${i}-${offset}`}
                    src={images[i]}
                    alt={offset === 0 ? alt : ""}
                    fill
                    sizes="100vw"
                    priority={offset === 0}
                    className={`object-contain px-2 sm:px-20 ${offset === 0 ? "animate-[gallery-in_250ms_ease-out]" : "invisible"}`}
                  />
                );
              })}
              {total > 1 && (
                <>
                  <NavButton side="left" label={labels.prev} onClick={() => go(-1)} />
                  <NavButton side="right" label={labels.next} onClick={() => go(1)} />
                </>
              )}
            </div>

            {total > 1 && (
              <ul className="flex justify-center gap-2 overflow-x-auto px-4 py-4 [scrollbar-width:none]">
                {images.map((src, i) => (
                  <li key={src} className="shrink-0">
                    <button
                      type="button"
                      data-thumb={i}
                      onClick={() => setIndex(i)}
                      aria-label={fill(labels.openPhoto, { n: i + 1 })}
                      aria-current={i === index}
                      className={`relative block h-14 w-20 overflow-hidden rounded-[4px] transition-opacity sm:h-16 sm:w-24 ${i === index ? "opacity-100 ring-2 ring-gold ring-offset-2 ring-offset-[#0b120e]" : "opacity-50 hover:opacity-90"}`}
                    >
                      <Image src={src} alt="" fill sizes="6rem" className="object-cover" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </dialog>
    </>
  );
}

function NavButton({ side, label, onClick }: { side: "left" | "right"; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 ${side === "left" ? "left-2 sm:left-5" : "right-2 sm:right-5"} grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/45 backdrop-blur transition-colors hover:bg-black/65 sm:size-12`}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" className="size-5 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]">
        <path d={side === "left" ? "M10 3.5 5.5 8l4.5 4.5" : "M6 3.5 10.5 8 6 12.5"} />
      </svg>
    </button>
  );
}
