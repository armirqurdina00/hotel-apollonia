"use client";

import { useState } from "react";
import { Field, Label, Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";

export type Option = { value: string; label: string; hint?: string };

type Props = {
  name: string;
  label: string;
  options: Option[];
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  onChange?: (value: string) => void;
  invalid?: boolean;
};

function Chevron() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="size-4 shrink-0 text-muted transition-transform group-data-[open]:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Check() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="size-4 shrink-0 text-emerald invisible group-data-[selected]:visible" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m4.5 10.5 3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A styled replacement for <select>. Submits with forms through a hidden input. */
export function SelectField({ name, label, options, defaultValue, placeholder, className = "", onChange, invalid }: Props) {
  const [value, setValue] = useState(defaultValue ?? "");
  const current = options.find((o) => o.value === value);
  return (
    <Field className={className}>
      <Label className="field-label">{label}</Label>
      <Listbox
        name={name}
        value={value}
        onChange={(v: string) => {
          setValue(v);
          onChange?.(v);
        }}
      >
        <ListboxButton
          aria-invalid={invalid || undefined}
          className="field group flex items-center justify-between gap-3 text-left data-[open]:outline data-[open]:outline-3 data-[open]:outline-gold"
        >
          <span className={`truncate ${current ? "" : "text-muted"}`}>{current?.label ?? placeholder ?? ""}</span>
          <Chevron />
        </ListboxButton>
        <ListboxOptions
          anchor={{ to: "bottom start", gap: 6, padding: 12 }}
          modal={false}
          className="z-50 w-[var(--button-width)] min-w-48 max-h-72 overflow-auto rounded-[var(--radius-soft)] bg-canvas p-1.5 text-ink shadow-[0_24px_60px_-20px_rgb(12_58_39/0.45)] ring-1 ring-line focus:outline-none"
        >
          {options.map((o) => (
            <ListboxOption
              key={o.value}
              value={o.value}
              className="group flex cursor-pointer items-center gap-2.5 rounded-[4px] px-3 py-2.5 data-[focus]:bg-mist data-[selected]:font-semibold"
            >
              <Check />
              <span className="truncate">{o.label}</span>
              {o.hint && <span className="ml-auto pl-3 text-sm text-muted">{o.hint}</span>}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </Listbox>
    </Field>
  );
}
