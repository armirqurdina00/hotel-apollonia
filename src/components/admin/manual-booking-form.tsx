"use client";

import { useActionState } from "react";
import { createManualBooking, type AdminState } from "@/app/admin/actions";
import { DateRangeField } from "@/components/ui/date-picker";
import { SelectField } from "@/components/ui/select";
import { useAdminI18n } from "./i18n";

export function ManualBookingForm({ rooms, today, tomorrow }: { rooms: { id: number; name: string }[]; today: string; tomorrow: string }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(createManualBooking, {});
  const { lang, t } = useAdminI18n();
  const m = t.newBooking;
  const f = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`mb-${name}`} className="field-label">
        {label}
      </label>
      <input id={`mb-${name}`} name={name} className="field" {...props} />
    </div>
  );
  return (
    <form action={action} className="mt-8 grid gap-6">
      {state.error && (
        <p role="alert" className="rounded-[var(--radius-soft)] border border-danger/40 bg-white p-4 text-danger">
          {state.error}
        </p>
      )}
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="font-semibold mb-3">{m.stay}</legend>
        <SelectField name="roomTypeId" label={m.roomType} className="sm:col-span-2" defaultValue={String(rooms[0]?.id ?? "")} options={rooms.map((r) => ({ value: String(r.id), label: r.name }))} />
        <div className="sm:col-span-2">
          <span className="field-label">{m.dates}</span>
          <DateRangeField lang={lang} min={today} checkIn={today} checkOut={tomorrow} labels={{ ...m.range, nights: t.nights }} />
        </div>
        <div className="grid grid-cols-3 gap-3 sm:col-span-2">
          {f("adults", m.adults, { type: "number", min: 1, max: 12, defaultValue: 2 })}
          {f("children", m.children, { type: "number", min: 0, max: 8, defaultValue: 0 })}
          {f("rooms", m.rooms, { type: "number", min: 1, max: 5, defaultValue: 1 })}
        </div>
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="font-semibold mb-3">{m.guest}</legend>
        {f("firstName", m.firstName, { required: true })}
        {f("lastName", m.lastName, { required: true })}
        {f("phone", m.phone, { type: "tel", required: true, placeholder: "+383" })}
        {f("email", m.email, { type: "email" })}
        {f("country", m.country, { maxLength: 2, placeholder: "XK" })}
        <SelectField
          name="locale"
          label={m.guestLanguage}
          defaultValue="sq"
          options={(["sq", "en", "de"] as const).map((l) => ({ value: l, label: t.guestLang[l] }))}
        />
        <label className="flex items-center gap-2 sm:col-span-2">
          <input type="checkbox" name="parking" className="size-4" /> {m.parking}
        </label>
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="font-semibold mb-3">{m.booking}</legend>
        <SelectField
          name="source"
          label={m.via}
          defaultValue="phone"
          options={(["phone", "walk_in", "ota"] as const).map((v) => ({ value: v, label: t.source[v] }))}
        />
        <SelectField
          name="status"
          label={m.status}
          defaultValue="confirmed"
          options={(["confirmed", "pending"] as const).map((v) => ({ value: v, label: t.status[v] }))}
        />
        <div className="sm:col-span-2">
          <label htmlFor="mb-notes" className="field-label">
            {m.requests}
          </label>
          <textarea id="mb-notes" name="notes" rows={2} className="field" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="mb-internal" className="field-label">
            {m.staffNote}
          </label>
          <textarea id="mb-internal" name="internalNote" rows={2} className="field" />
        </div>
        <label className="flex items-center gap-2 sm:col-span-2">
          <input type="checkbox" name="sendEmail" defaultChecked className="size-4" /> {m.sendEmail}
        </label>
      </fieldset>
      <div>
        <button className="btn btn-primary" disabled={pending}>
          {pending ? t.saving : m.submit}
        </button>
      </div>
    </form>
  );
}
