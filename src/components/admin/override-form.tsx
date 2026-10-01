"use client";

import { useActionState } from "react";
import { saveOverrides, type AdminState } from "@/app/admin/actions";
import { DateField } from "@/components/ui/date-picker";
import { SelectField } from "@/components/ui/select";
import { useAdminI18n } from "./i18n";

type Defaults = { roomTypeId?: number; from: string; to: string; price: string; blockedUnits: number; closed: boolean };

export function OverrideForm({ rooms, defaults }: { rooms: { id: number; name: string }[]; defaults: Defaults }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(saveOverrides, {});
  const { lang, t } = useAdminI18n();
  const o = t.overrides;
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
        label={o.roomType}
        className="sm:col-span-2"
        defaultValue={String(defaults.roomTypeId ?? "")}
        options={[...rooms.map((r) => ({ value: String(r.id), label: r.name })), { value: "0", label: o.allRooms }]}
      />
      <DateField lang={lang} name="from" label={o.from} placeholder={o.pickDate} defaultValue={defaults.from} />
      <DateField lang={lang} name="to" label={o.to} placeholder={o.pickDate} defaultValue={defaults.to} />
      <div>
        <label htmlFor="ov-price" className="field-label">
          {o.price}
        </label>
        <input id="ov-price" name="price" inputMode="decimal" placeholder={o.automatic} defaultValue={defaults.price} className="field" />
        <p className="mt-1 text-xs text-muted">{o.priceHint}</p>
      </div>
      <div>
        <label htmlFor="ov-blocked" className="field-label">
          {o.blocked}
        </label>
        <input id="ov-blocked" name="blockedUnits" type="number" min={0} defaultValue={defaults.blockedUnits} className="field" />
        <p className="mt-1 text-xs text-muted">{o.blockedHint}</p>
      </div>
      <label className="flex items-center gap-2 sm:col-span-2">
        <input type="checkbox" name="closed" defaultChecked={defaults.closed} className="size-4" /> {o.closed}
      </label>
      <div className="sm:col-span-2 flex flex-wrap gap-3">
        <button name="mode" value="save" className="btn btn-primary" disabled={pending}>
          {t.saveChanges}
        </button>
        <button name="mode" value="reset" className="btn btn-ghost" disabled={pending}>
          {o.reset}
        </button>
      </div>
    </form>
  );
}
