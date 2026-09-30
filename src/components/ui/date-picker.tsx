"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { DayPicker, type DateRange, type DayButtonProps } from "react-day-picker";
import { sq, enGB, de } from "react-day-picker/locale";
import { addDays, diffDays, formatDate } from "@/lib/dates";
import { plural, type Locale, type Plural } from "@/i18n/config";

const LOCALES = { sq, en: enGB, de };

/** "YYYY-MM-DD" to a local Date at midnight, which is what DayPicker works with. */
function toDate(iso: string | undefined) {
  if (!iso) return undefined;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function toISO(d: Date | undefined) {
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * DayPicker's own day button calls focus() as soon as the calendar opens,
 * before the popover has moved under its field, so the browser scrolled the
 * page to wherever the panel briefly sat (the top). Focusing without scrolling
 * keeps the page where it is; the panel then appears under the field.
 */
// `day` is taken out only so it doesn't reach the <button>.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function DayButton({ day, modifiers, ...props }: DayButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (modifiers.focused) ref.current?.focus({ preventScroll: true });
  }, [modifiers.focused]);
  return <button ref={ref} {...props} />;
}
const COMPONENTS = { DayButton };

function useIsWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return wide;
}

function CalendarIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="size-5 shrink-0 text-emerald" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="4.5" width="14" height="12" rx="1.5" />
      <path d="M3 8.5h14M7 2.5v4M13 2.5v4" strokeLinecap="round" />
    </svg>
  );
}

export type RangeLabels = {
  checkIn: string;
  checkOut: string;
  pickCheckIn: string;
  pickCheckOut: string;
  nights: Plural;
  clear: string;
  done: string;
  placeholder: string;
};

type RangeProps = {
  lang: Locale;
  labels: RangeLabels;
  /** Earliest selectable arrival. */
  min: string;
  maxNights?: number;
  checkIn?: string;
  checkOut?: string;
  onChange?: (checkIn: string, checkOut: string) => void;
  names?: { checkIn: string; checkOut: string };
  /** Allow departure on the arrival day (admin ranges of single days). */
  inclusive?: boolean;
};

/** One control for arrival and departure, like the date field on hotel sites. */
export function DateRangeField({ lang, labels, min, maxNights = 30, checkIn, checkOut, onChange, names = { checkIn: "checkIn", checkOut: "checkOut" }, inclusive }: RangeProps) {
  const [range, setRange] = useState<{ from?: string; to?: string }>({ from: checkIn, to: checkOut });
  const wide = useIsWide();
  const id = useId();
  const nights = range.from && range.to ? diffDays(range.from, range.to) : 0;

  const commit = (from?: string, to?: string) => {
    setRange({ from, to });
    if (from && to) onChange?.(from, to);
  };

  // Weekday only where there's room for it; "Di., 29. Sept." doesn't fit half a phone screen.
  const short = (d?: string) =>
    d ? (
      <>
        <span className="sm:hidden">{formatDate(d, lang, {})}</span>
        <span className="hidden sm:inline">{formatDate(d, lang, { weekday: "short" })}</span>
      </>
    ) : (
      labels.placeholder
    );

  return (
    <Popover className="relative">
      {({ close }) => (
        <>
          <input type="hidden" name={names.checkIn} value={range.from ?? ""} />
          <input type="hidden" name={names.checkOut} value={range.to ?? ""} />
          <PopoverButton
            aria-describedby={`${id}-sum`}
            className="field group !p-0 grid grid-cols-2 text-left !min-h-[3.75rem] data-[open]:outline data-[open]:outline-3 data-[open]:outline-gold"
          >
            <span className="flex items-center gap-2.5 px-3.5 py-2 border-r border-line">
              <CalendarIcon />
              <span className="min-w-0">
                <span className="block text-xs text-muted leading-tight">{labels.checkIn}</span>
                <span className="block font-semibold truncate">{short(range.from)}</span>
              </span>
            </span>
            <span className="flex items-center gap-2.5 px-3.5 py-2">
              <span className="min-w-0">
                <span className="block text-xs text-muted leading-tight">{labels.checkOut}</span>
                <span className="block font-semibold truncate">{short(range.to)}</span>
              </span>
            </span>
          </PopoverButton>
          <span id={`${id}-sum`} className="sr-only">
            {nights ? plural(lang, labels.nights, nights) : ""}
          </span>
          <PopoverPanel
            anchor={{ to: "bottom start", gap: 8, padding: 12 }}
            className="cal-panel z-50 rounded-[var(--radius-soft)] bg-canvas text-ink shadow-[0_24px_60px_-20px_rgb(12_58_39/0.45)] ring-1 ring-line p-4 sm:p-5 focus:outline-none"
          >
            <p className="text-sm font-semibold text-emerald mb-2" aria-live="polite">
              {!range.from || range.to ? labels.pickCheckIn : labels.pickCheckOut}
            </p>
            <DayPicker
              mode="range"
              locale={LOCALES[lang]}
              weekStartsOn={1}
              numberOfMonths={wide ? 2 : 1}
              autoFocus
              showOutsideDays={false}
              defaultMonth={toDate(range.from ?? min)}
              startMonth={toDate(min)}
              endMonth={toDate(addDays(min, 365))}
              disabled={[
                { before: toDate(min)! },
                // While choosing departure, only allow a stay up to maxNights.
                ...(range.from && !range.to ? [{ after: toDate(addDays(range.from, maxNights))! }] : []),
              ]}
              selected={{ from: toDate(range.from), to: toDate(range.to) } as DateRange}
              onSelect={(_, day) => {
                const d = toISO(day);
                if (!range.from || range.to) return commit(d, undefined);
                if (d > range.from || (inclusive && d === range.from)) {
                  commit(range.from, d);
                  close();
                  return;
                }
                commit(d, undefined);
              }}
              classNames={{ root: "cal" }}
              components={COMPONENTS}
            />
            <div className="mt-3 flex items-center gap-3 border-t border-line pt-3">
              <span className="text-sm text-muted">{nights ? plural(lang, labels.nights, nights) : ""}</span>
              <button type="button" className="ml-auto text-sm font-semibold link" onClick={() => commit(undefined, undefined)}>
                {labels.clear}
              </button>
              <button type="button" className="btn btn-primary !min-h-10 !py-2 !px-4 text-sm" onClick={() => close()} disabled={!range.from || !range.to}>
                {labels.done}
              </button>
            </div>
          </PopoverPanel>
        </>
      )}
    </Popover>
  );
}

type SingleProps = {
  lang: Locale;
  name: string;
  label: string;
  placeholder: string;
  min?: string;
  max?: string;
  defaultValue?: string;
  invalid?: boolean;
  describedBy?: string;
  onChange?: (value: string) => void;
};

export function DateField({ lang, name, label, placeholder, min, max, defaultValue, invalid, describedBy, onChange }: SingleProps) {
  const [value, setValue] = useState(defaultValue ?? "");
  const id = useId();
  return (
    <Popover className="relative">
      {({ close }) => (
        <>
          <span id={`${id}-l`} className="field-label">
            {label}
          </span>
          <input type="hidden" name={name} value={value} />
          <PopoverButton
            aria-labelledby={`${id}-l ${id}-v`}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className="field flex items-center gap-2.5 text-left data-[open]:outline data-[open]:outline-3 data-[open]:outline-gold"
          >
            <CalendarIcon />
            <span id={`${id}-v`} className={value ? "" : "text-muted"}>
              {value ? formatDate(value, lang, { weekday: "short", year: true }) : placeholder}
            </span>
          </PopoverButton>
          <PopoverPanel
            anchor={{ to: "bottom start", gap: 8, padding: 12 }}
            className="cal-panel z-50 rounded-[var(--radius-soft)] bg-canvas text-ink shadow-[0_24px_60px_-20px_rgb(12_58_39/0.45)] ring-1 ring-line p-4 focus:outline-none"
          >
            <DayPicker
              mode="single"
              locale={LOCALES[lang]}
              weekStartsOn={1}
              autoFocus
              showOutsideDays={false}
              defaultMonth={toDate(value || min)}
              startMonth={toDate(min)}
              endMonth={max ? toDate(max) : undefined}
              disabled={[...(min ? [{ before: toDate(min)! }] : []), ...(max ? [{ after: toDate(max)! }] : [])]}
              selected={toDate(value)}
              onSelect={(_, day) => {
                const v = toISO(day);
                setValue(v);
                onChange?.(v);
                close();
              }}
              classNames={{ root: "cal" }}
              components={COMPONENTS}
            />
          </PopoverPanel>
        </>
      )}
    </Popover>
  );
}
