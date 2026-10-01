"use client";

import { useLinkStatus } from "next/link";

/**
 * A spinner inside a <Link> that appears while the page it opens is loading.
 * Always rendered and only faded in, so the button never changes size.
 */
export function LinkSpinner({ className = "" }: { className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" className={`size-5 animate-spin transition-opacity duration-150 ${pending ? "opacity-100" : "opacity-0"} ${className}`}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
