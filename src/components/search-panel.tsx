"use client";

import { useId, useState } from "react";
import { addDays, diffDays } from "@/lib/dates";
import { DateRangeField } from "./ui/date-picker";
import { plural, type Locale, type Plural } from "@/i18n/config";

export type SearchLabels = {
  checkIn: string;
  checkOut: string;
  adults: string;
  children: string;
  rooms: string;
  submit: string;
  nights: Plural;
  directPerk: string;
  pickCheckIn: string;
  pickCheckOut: string;
  clear: string;
  done: string;
  placeholder: string;
};

type Props = {
  lang: Locale;
  labels: SearchLabels;
  today: string;
  initial?: { checkIn?: string; checkOut?: string; adults?: number; children?: number; rooms?: number };
  layout?: "stacked" | "bar";
};

function Counter({ label, name, value, min, max, onChange }: { label: string; name: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  const id = useId();
  return (
    <div className="stepper-wrap">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="stepper">
        <button
          type="button"
          aria-label={`${label} −1`}
          className="stepper-btn"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8h9" /></svg>
        </button>
        <input
          id={id}
          name={name}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || min)))}
          className="stepper-input"
        />
        <button
          type="button"
          aria-label={`${label} +1`}
          className="stepper-btn"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8h9M8 3.5v9" /></svg>
        </button>
      </div>
    </div>
  );
}

export function SearchPanel({ lang, labels, today, initial = {}, layout = "stacked" }: Props) {
  const [checkIn, setCheckIn] = useState(initial.checkIn ?? today);
  const [checkOut, setCheckOut] = useState(initial.checkOut ?? addDays(initial.checkIn ?? today, 1));
  const [adults, setAdults] = useState(initial.adults ?? 2);
  const [children, setChildren] = useState(initial.children ?? 0);
  const [rooms, setRooms] = useState(initial.rooms ?? 1);
  const nights = checkIn && checkOut && checkOut > checkIn ? diffDays(checkIn, checkOut) : 0;

  const bar = layout === "bar";

  return (
    // "#results" makes the browser land on the results, not back at the search form.
    <form action={`/${lang}/book#results`} method="get" className={bar ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_8.5rem_8.5rem_8.5rem_auto] lg:items-end" : "grid gap-4"}>
      <div className={bar ? "sm:col-span-2 lg:col-span-1" : ""}>
        <DateRangeField
          lang={lang}
          min={today}
          checkIn={checkIn}
          checkOut={checkOut}
          onChange={(a, b) => {
            setCheckIn(a);
            setCheckOut(b);
          }}
          labels={{
            checkIn: labels.checkIn,
            checkOut: labels.checkOut,
            pickCheckIn: labels.pickCheckIn,
            pickCheckOut: labels.pickCheckOut,
            nights: labels.nights,
            clear: labels.clear,
            done: labels.done,
            placeholder: labels.placeholder,
          }}
        />
      </div>
      {/* Below desktop the counters share one row, as in the homepage hero; on desktop they join the single-line bar. */}
      <div className={bar ? "grid grid-cols-3 gap-3 sm:col-span-2 lg:contents" : "grid grid-cols-3 gap-3"}>
        <Counter label={labels.adults} name="adults" value={adults} min={1} max={12} onChange={setAdults} />
        <Counter label={labels.children} name="children" value={children} min={0} max={8} onChange={setChildren} />
        <Counter label={labels.rooms} name="rooms" value={rooms} min={1} max={5} onChange={setRooms} />
      </div>
      <div className={bar ? "sm:col-span-2 lg:col-span-1" : "mt-1"}>
        <button type="submit" disabled={nights === 0} className={`btn ${bar ? "btn-primary" : "btn-gold"} w-full`}>
          {labels.submit}
          {nights > 0 && <span className="font-normal opacity-80">({plural(lang, labels.nights, nights)})</span>}
        </button>
      </div>
      {!bar && <p className="text-sm text-white/75">{labels.directPerk}</p>}
    </form>
  );
}
