"use client";

import { useActionState } from "react";
import { bookRoomAction, type FormState } from "@/app/[lang]/actions";
import { SelectField } from "./ui/select";

type Labels = {
  firstName: string;
  lastName: string;
  email: string;
  emailHint: string;
  phone: string;
  country: string;
  arrival: string;
  arrivalUnknown: string;
  parking: string;
  notes: string;
  notesHint: string;
  payAtHotel: string;
  cancellation: string;
  agree: string;
  submit: string;
  submitting: string;
};

type Props = {
  lang: string;
  room: string;
  stay: { checkIn: string; checkOut: string; adults: number; children: number; rooms: number };
  labels: Labels;
  errors: Record<string, string>;
  countries: { code: string; name: string }[];
  defaultCountry: string;
};

const ARRIVAL_SLOTS = ["12:00", "14:00", "16:00", "18:00", "20:00", "22:00", "00:00+"];

export function CheckoutForm({ lang, room, stay, labels, errors, countries, defaultCountry }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(bookRoomAction, {});
  const v = state.values ?? {};
  const err = (k: string) => (state.fields?.[k] ? errors[state.fields[k]] ?? errors.required : undefined);

  const input = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement>, hint?: string) => (
    <div>
      <label htmlFor={`co-${name}`} className="field-label">
        {label}
      </label>
      <input
        id={`co-${name}`}
        name={name}
        defaultValue={v[name]}
        aria-invalid={err(name) ? true : undefined}
        aria-describedby={[hint ? `co-${name}-hint` : "", err(name) ? `co-${name}-err` : ""].filter(Boolean).join(" ") || undefined}
        className="field"
        {...props}
      />
      {hint && (
        <p id={`co-${name}-hint`} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      )}
      {err(name) && (
        <p id={`co-${name}-err`} className="mt-1 text-sm text-danger">
          {err(name)}
        </p>
      )}
    </div>
  );

  return (
    <form action={action} className="grid gap-5" noValidate>
      {state.error && (
        <p role="alert" className="rounded-[var(--radius-soft)] border border-danger/40 bg-white p-4 text-danger">
          {errors[state.error] ?? errors.generic}
        </p>
      )}
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="room" value={room} />
      {Object.entries(stay).map(([k, val]) => (
        <input key={k} type="hidden" name={k} value={String(val)} />
      ))}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      <div className="grid gap-5 sm:grid-cols-2">
        {input("firstName", labels.firstName, { autoComplete: "given-name", required: true })}
        {input("lastName", labels.lastName, { autoComplete: "family-name", required: true })}
      </div>
      {input("email", labels.email, { type: "email", autoComplete: "email", required: true, inputMode: "email" }, labels.emailHint)}
      <div className="grid gap-5 sm:grid-cols-2">
        {input("phone", labels.phone, { type: "tel", autoComplete: "tel", required: true, placeholder: "+383 44 123 456" })}
        <SelectField name="country" label={labels.country} defaultValue={v.country ?? defaultCountry} options={countries.map((c) => ({ value: c.code, label: c.name }))} />
      </div>
      <SelectField
        name="arrivalTime"
        label={labels.arrival}
        className="sm:max-w-xs"
        defaultValue={v.arrivalTime ?? ""}
        options={[
          { value: "", label: labels.arrivalUnknown },
          ...ARRIVAL_SLOTS.map((s, i) => ({
            value: s,
            label: i < ARRIVAL_SLOTS.length - 1 ? `${s}–${ARRIVAL_SLOTS[i + 1].replace("+", "")}` : "00:00 +",
          })),
        ]}
      />
      <label className="flex items-start gap-3 rounded-[var(--radius-soft)] border border-line bg-white p-4 cursor-pointer">
        <input type="checkbox" name="parking" defaultChecked={v.parking === "on"} className="mt-1 size-5 accent-[var(--color-emerald)]" />
        <span>{labels.parking}</span>
      </label>
      <div>
        <label htmlFor="co-notes" className="field-label">
          {labels.notes}
        </label>
        <textarea id="co-notes" name="notes" rows={3} maxLength={1000} defaultValue={v.notes} aria-describedby="co-notes-hint" className="field" />
        <p id="co-notes-hint" className="mt-1 text-sm text-muted">
          {labels.notesHint}
        </p>
      </div>

      <div className="rounded-[var(--radius-soft)] bg-gold-soft p-4 text-[0.9375rem] space-y-1">
        <p className="font-semibold">{labels.payAtHotel}</p>
        <p>{labels.cancellation}</p>
      </div>
      <div>
        <button type="submit" className="btn btn-primary w-full sm:w-auto sm:min-w-64 text-lg" disabled={pending}>
          {pending ? labels.submitting : labels.submit}
        </button>
        <p className="mt-3 text-sm text-muted">{labels.agree}</p>
      </div>
    </form>
  );
}
