"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { formatDate } from "@/lib/dates";
import { isMeetingDuration } from "@/lib/hotel";
import { fill, plural } from "@/i18n/config";
import type { AdminDict, AdminLang } from "@/i18n/admin";
import { useAdminI18n } from "./i18n";

const POLL_MS = 20_000;

type Pulse = {
  b: number;
  i: number;
  bookings: { id: number; ref: string; room: string; checkIn: string; checkOut: string; guest: string }[];
  inquiries: { id: number; kind: "table" | "meeting" | "contact"; name: string; date: string | null; time: string | null; people: number | null }[];
};

type Alert = { key: string; title: string; detail: string; href: string };

function toAlerts(p: Pulse, lang: AdminLang, t: AdminDict): Alert[] {
  const short = (d: string) => formatDate(d, lang, { month: "short" });
  return [
    ...p.bookings.map((b) => ({
      key: `b${b.id}`,
      title: fill(t.live.newBooking, { room: b.room }),
      detail: `${b.guest}, ${short(b.checkIn)} – ${short(b.checkOut)} (${b.ref})`,
      href: `/admin/bookings/${b.id}`,
    })),
    ...p.inquiries.map((q) => ({
      key: `i${q.id}`,
      title: fill(t.live.request, { kind: t.live.kind[q.kind], name: q.name }),
      detail: [q.date && short(q.date), isMeetingDuration(q.time) ? t.inquiries.durations[q.time] : q.time, q.people && plural(lang, t.people, q.people)]
        .filter(Boolean)
        .join(", "),
      href: "/admin/inquiries",
    })),
  ];
}

const noSubscribe = () => () => {};
/** The browser's notification permission; "unsupported" on the server and in browsers without it. */
function useNotificationPermission() {
  return useSyncExternalStore<NotificationPermission | "unsupported">(
    noSubscribe,
    () => ("Notification" in window ? Notification.permission : "unsupported"),
    () => "unsupported",
  );
}

/** A soft two-note chime, so no audio file is needed. */
function chime(ctx: AudioContext) {
  const now = ctx.currentTime;
  [880, 1318.5].forEach((freq, n) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const start = now + n * 0.16;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.65);
  });
}

/**
 * Checks for new website bookings and table/meeting requests every 20 seconds.
 * On news it refreshes the page data (lists and menu badges), chimes, shows a
 * desktop notification when allowed, counts them in the tab title until staff
 * look, and pops up a card linking to each one.
 */
export function LiveUpdates({ initial }: { initial: { b: number; i: number } }) {
  const router = useRouter();
  const { lang, t } = useAdminI18n();
  const last = useRef(initial);
  const audio = useRef<AudioContext | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unseen, setUnseen] = useState(0);
  const browserPermission = useNotificationPermission();
  const [answered, setAnswered] = useState<NotificationPermission | null>(null);
  const permission = answered ?? browserPermission;

  useEffect(() => {
    // Browsers only allow sound after the page has been clicked or typed in once.
    const unlock = () => {
      audio.current ??= new AudioContext();
      audio.current.resume();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const poll = useCallback(async () => {
    let p: Pulse;
    try {
      const res = await fetch(`/api/admin/pulse?b=${last.current.b}&i=${last.current.i}`, { cache: "no-store" });
      if (!res.ok) return;
      p = await res.json();
    } catch {
      return; // offline for a moment; try again next round
    }
    if (p.b === last.current.b && p.i === last.current.i) return;
    last.current = { b: p.b, i: p.i };
    router.refresh();

    const fresh = toAlerts(p, lang, t);
    if (fresh.length === 0) return;
    setAlerts((a) => [...fresh, ...a].slice(0, 5));
    if (document.visibilityState !== "visible" || !document.hasFocus()) setUnseen((n) => n + fresh.length);
    if (audio.current?.state === "running") chime(audio.current);
    if ("Notification" in window && Notification.permission === "granted") {
      for (const a of fresh) {
        const n = new Notification(a.title, { body: a.detail, tag: a.key, icon: "/brand/emblem.png" });
        n.onclick = () => {
          window.focus();
          router.push(a.href);
          n.close();
        };
      }
    }
  }, [router, lang, t]);

  useEffect(() => {
    const timer = setInterval(poll, POLL_MS);
    // Catch up straight away when staff come back to the tab.
    const back = () => {
      if (document.visibilityState === "visible") {
        setUnseen(0);
        poll();
      }
    };
    const focus = () => setUnseen(0);
    document.addEventListener("visibilitychange", back);
    window.addEventListener("focus", focus);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", back);
      window.removeEventListener("focus", focus);
    };
  }, [poll]);

  // "(2) Bookings" in the tab title while there's news staff haven't looked at.
  // Next.js rewrites the title on every refresh, so the count is put back when it does.
  useEffect(() => {
    const apply = () => {
      const base = document.title.replace(/^\(\d+\) /, "");
      const title = unseen ? `(${unseen}) ${base}` : base;
      if (document.title !== title) document.title = title;
    };
    apply();
    if (!unseen) return;
    const watch = new MutationObserver(apply);
    watch.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => watch.disconnect();
  }, [unseen]);

  return (
    <>
      {permission === "default" && (
        <button
          type="button"
          onClick={async () => setAnswered(await Notification.requestPermission())}
          className="shrink-0 rounded-[4px] px-3 py-2 text-left text-sm text-white/70 hover:bg-white/10 hover:text-white"
        >
          {t.live.enableAlerts}
        </button>
      )}
      {alerts.length > 0 && (
        <ul aria-live="polite" className="fixed bottom-4 right-4 z-50 grid w-[min(22rem,calc(100vw-2rem))] gap-2">
          {alerts.map((a) => (
            <li key={a.key} className="flex items-start gap-3 rounded-[var(--radius-soft)] border border-line bg-canvas p-4 text-ink shadow-[0_18px_40px_-16px_rgb(12_58_39/0.45)]">
              <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-gold" />
              <Link href={a.href} onClick={() => setAlerts((l) => l.filter((x) => x.key !== a.key))} className="min-w-0 flex-1">
                <span className="block font-semibold hover:text-emerald">{a.title}</span>
                {a.detail && <span className="mt-0.5 block text-sm text-muted">{a.detail}</span>}
              </Link>
              <button
                type="button"
                aria-label={t.live.dismiss}
                onClick={() => setAlerts((l) => l.filter((x) => x.key !== a.key))}
                className="-m-1 grid size-7 shrink-0 place-items-center rounded-full text-muted hover:bg-mist hover:text-ink"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
