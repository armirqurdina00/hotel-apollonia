"use client";

import { useActionState } from "react";
import { createManualBooking, type AdminState } from "@/app/admin/actions";
import { DateRangeField } from "@/components/ui/date-picker";
import { SelectField } from "@/components/ui/select";

export function ManualBookingForm({ rooms, today, tomorrow }: { rooms: { id: number; name: string }[]; today: string; tomorrow: string }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(createManualBooking, {});
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
        <legend className="font-semibold mb-3">Stay</legend>
        <SelectField name="roomTypeId" label="Room type" className="sm:col-span-2" defaultValue={String(rooms[0]?.id ?? "")} options={rooms.map((r) => ({ value: String(r.id), label: r.name }))} />
        <div className="sm:col-span-2">
          <span className="field-label">Dates</span>
          <DateRangeField lang="en" min={today} checkIn={today} checkOut={tomorrow} labels={{ checkIn: "Arrival", checkOut: "Departure", pickCheckIn: "Select the arrival day", pickCheckOut: "Now select the departure day", nights: { one: "{n} night", other: "{n} nights" }, clear: "Clear", done: "Done", placeholder: "Add date" }} />
        </div>
        <div className="grid grid-cols-3 gap-3 sm:col-span-2">
          {f("adults", "Adults", { type: "number", min: 1, max: 12, defaultValue: 2 })}
          {f("children", "Children", { type: "number", min: 0, max: 8, defaultValue: 0 })}
          {f("rooms", "Rooms", { type: "number", min: 1, max: 5, defaultValue: 1 })}
        </div>
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="font-semibold mb-3">Guest</legend>
        {f("firstName", "First name", { required: true })}
        {f("lastName", "Last name", { required: true })}
        {f("phone", "Phone", { type: "tel", required: true, placeholder: "+383" })}
        {f("email", "Email (optional)", { type: "email" })}
        {f("country", "Country code", { maxLength: 2, placeholder: "XK" })}
        <SelectField name="locale" label="Guest language" defaultValue="sq" options={[{ value: "sq", label: "Albanian" }, { value: "en", label: "English" }, { value: "de", label: "German" }]} />
        <label className="flex items-center gap-2 sm:col-span-2">
          <input type="checkbox" name="parking" className="size-4" /> Needs a parking space
        </label>
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="font-semibold mb-3">Booking</legend>
        <SelectField name="source" label="Booked via" defaultValue="phone" options={[{ value: "phone", label: "Phone" }, { value: "walk_in", label: "Walk-in" }, { value: "ota", label: "Booking.com / OTA" }]} />
        <SelectField name="status" label="Status" defaultValue="confirmed" options={[{ value: "confirmed", label: "Confirmed" }, { value: "pending", label: "Pending" }]} />
        <div className="sm:col-span-2">
          <label htmlFor="mb-notes" className="field-label">
            Guest requests
          </label>
          <textarea id="mb-notes" name="notes" rows={2} className="field" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="mb-internal" className="field-label">
            Staff note
          </label>
          <textarea id="mb-internal" name="internalNote" rows={2} className="field" />
        </div>
        <label className="flex items-center gap-2 sm:col-span-2">
          <input type="checkbox" name="sendEmail" defaultChecked className="size-4" /> Email the confirmation to the guest (if an email is given)
        </label>
      </fieldset>
      <div>
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Saving" : "Save booking"}
        </button>
      </div>
    </form>
  );
}
