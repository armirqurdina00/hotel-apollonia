"use client";

import { useActionState, useId } from "react";
import { inquiryAction, type FormState } from "@/app/[lang]/actions";
import type { Locale } from "@/i18n/config";
import { MEETING_DURATIONS, type MeetingDuration } from "@/lib/hotel";
import { DateField } from "./ui/date-picker";
import { SelectField } from "./ui/select";

/** Restaurant booking slots, every half hour while the kitchen is open. */
const TIME_SLOTS = Array.from({ length: 22 }, (_, i) => {
  const m = 12 * 60 + i * 30;
  const v = `${String(Math.floor(m / 60)).padStart(2, "0")}:${m % 60 ? "30" : "00"}`;
  return { value: v, label: v };
});

type Labels = {
  name: string;
  phone: string;
  emailOptional: string;
  date: string;
  time: string;
  duration: string;
  durations: Record<MeetingDuration, string>;
  people: string;
  message: string;
  send: string;
  sending: string;
  sent: string;
  pickDate: string;
  pickTime: string;
  errors: Record<string, string>;
};

export function InquiryForm({ kind, lang, today, labels, withTime }: { kind: "table" | "meeting"; lang: Locale; today: string; labels: Labels; withTime?: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(inquiryAction, {});
  const id = useId();
  const v = state.values ?? {};
  const err = (k: string) => (state.fields?.[k] ? labels.errors[state.fields[k]] ?? labels.errors.required : undefined);

  if (state.ok) {
    return (
      <p role="status" className="rounded-[var(--radius-soft)] bg-white border border-line p-5">
        {labels.sent}
      </p>
    );
  }

  const field = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>
      <label htmlFor={`${id}-${name}`} className="field-label">
        {label}
      </label>
      <input
        id={`${id}-${name}`}
        name={name}
        defaultValue={v[name]}
        aria-invalid={err(name) ? true : undefined}
        aria-describedby={err(name) ? `${id}-${name}-err` : undefined}
        className="field"
        {...props}
      />
      {err(name) && (
        <p id={`${id}-${name}-err`} className="mt-1 text-sm text-danger">
          {err(name)}
        </p>
      )}
    </div>
  );

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="lang" value={lang} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {field("name", labels.name, { autoComplete: "name", required: true })}
      {field("phone", labels.phone, { type: "tel", autoComplete: "tel", required: true, placeholder: "+383" })}
      <div>
        <DateField
          lang={lang}
          name="date"
          label={labels.date}
          placeholder={labels.pickDate}
          min={today}
          defaultValue={v.date}
          invalid={Boolean(err("date"))}
          describedBy={err("date") ? `${id}-date-err` : undefined}
        />
        {err("date") && (
          <p id={`${id}-date-err`} className="mt-1 text-sm text-danger">
            {err("date")}
          </p>
        )}
      </div>
      {withTime ? (
        <SelectField name="time" label={labels.time} options={TIME_SLOTS} defaultValue={v.time ?? "20:00"} placeholder={labels.pickTime} />
      ) : (
        // Conference rooms are booked by part of the day; the value is stored in the same `time` field.
        <SelectField
          name="time"
          label={labels.duration}
          options={MEETING_DURATIONS.map((d) => ({ value: d, label: labels.durations[d] }))}
          defaultValue={v.time ?? "full_day"}
        />
      )}
      {field("people", labels.people, { type: "number", min: 1, max: 500, inputMode: "numeric", required: true, defaultValue: v.people ?? (kind === "table" ? "4" : "20") })}
      {!withTime && field("email", labels.emailOptional, { type: "email", autoComplete: "email" })}
      <div className="sm:col-span-2">
        <label htmlFor={`${id}-message`} className="field-label">
          {labels.message}
        </label>
        <textarea id={`${id}-message`} name="message" rows={3} defaultValue={v.message} className="field" />
      </div>
      <div className="sm:col-span-2">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? labels.sending : labels.send}
        </button>
      </div>
    </form>
  );
}
