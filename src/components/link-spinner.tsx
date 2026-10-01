"use client";

import { useLinkStatus } from "next/link";

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" className={`size-5 animate-spin ${className}`}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * A button's label inside a <Link>: while the page it opens is loading, a
 * spinner and `pending` text replace it, like the search button.
 */
export function PendingLabel({ label, pending: pendingLabel }: { label: string; pending: string }) {
  const { pending } = useLinkStatus();
  return pending ? (
    <>
      <Spinner />
      <span role="status">{pendingLabel}</span>
    </>
  ) : (
    label
  );
}

/**
 * Marks its <Link> as loading with a `data-link-pending` element, so the
 * card around the link can show progress with CSS (`group-has-[[data-link-pending]]`).
 */
export function PendingMarker() {
  const { pending } = useLinkStatus();
  return pending ? <span data-link-pending hidden /> : null;
}

/** Dims a card's photo and spins while the card's link is loading (pair with <PendingMarker>). */
export function CardPendingOverlay() {
  return (
    <span className="pointer-events-none absolute inset-0 hidden place-items-center bg-forest/35 text-white group-has-[[data-link-pending]]:grid">
      <Spinner className="size-9 drop-shadow" />
    </span>
  );
}
