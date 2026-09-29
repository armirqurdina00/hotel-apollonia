"use client";

import { useActionState } from "react";
import { saveOverrides, type AdminState } from "@/app/admin/actions";
import { DateField } from "@/components/ui/date-picker";
import { SelectField } from "@/components/ui/select";

type Defaults = { roomTypeId?: number; from: string; to: string; price: string; blockedUnits: number; closed: boolean };

export function OverrideForm({ rooms, defaults }: { rooms: { id: number; name: string }[]; defaults: Defaults }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(saveOverrides, {});
  return (
    <form action={action} className="mt-4 grid gap-4 rounded-[var(--radius-soft)] border border-line bg-mist p-5 sm:grid-cols-2">
      {state.error && (
        <p role="alert" className="sm:col-span-2 text-danger">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p role="status" className="sm:col-span-2 text-ok font-semibold">
          {state.ok}
        </p>
      )}
      <SelectField
        name="roomTypeId"
        label="Room type"
        className="sm:col-span-2"
        defaultValue={String(defaults.roomTypeId ?? "")}
        options={[...rooms.map((r) => ({ value: String(r.id), label: r.name })), { value: "0", label: "All room types" }]}
      />
      <DateField lang="en" name="from" label="From night of" placeholder="Choose a date" defaultValue={defaults.from} />
      <DateField lang="en" name="to" label="Up to and including night of" placeholder="Choose a date" defaultValue={defaults.to} />
      <div>
        <label htmlFor="ov-price" className="field-label">
          Price per night (€)
        </label>
        <input id="ov-price" name="price" inputMode="decimal" placeholder="Automatic" defaultValue={defaults.price} className="field" />
        <p className="mt-1 text-xs text-muted">Leave empty to use the automatic price.</p>
      </div>
      <div>
        <label htmlFor="ov-blocked" className="field-label">
          Rooms to hold back
        </label>
        <input id="ov-blocked" name="blockedUnits" type="number" min={0} defaultValue={defaults.blockedUnits} className="field" />
        <p className="mt-1 text-xs text-muted">For maintenance, groups, or rooms sold on other websites.</p>
      </div>
      <label className="flex items-center gap-2 sm:col-span-2">
        <input type="checkbox" name="closed" defaultChecked={defaults.closed} className="size-4" /> Stop online sales for these nights
      </label>
      <div className="sm:col-span-2 flex flex-wrap gap-3">
        <button name="mode" value="save" className="btn btn-primary" disabled={pending}>
          Save changes
        </button>
        <button name="mode" value="reset" className="btn btn-ghost" disabled={pending}>
          Reset to automatic
        </button>
      </div>
    </form>
  );
}
