"use client";

import Image from "next/image";
import { startTransition, useActionState, useState } from "react";
import { deleteUploadedPhoto, saveRoomDetails, type AdminState } from "@/app/admin/actions";
import type { LibraryPhoto } from "@/lib/photos";
import { DeletePhoto, PhotoUpload } from "./photo-upload";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/i18n/config";

type Localized = Record<Locale, string>;

export type RoomFormValues = {
  id: number;
  name: Localized;
  summary: Localized;
  description: Localized;
  bed: Localized;
  sizeM2: number;
  maxAdults: number;
  maxChildren: number;
  basePrice: number;
  inventory: number;
  images: string[];
  amenities: string[];
  active: boolean;
};

export function RoomForm({ room, photos, amenities }: { room: RoomFormValues; photos: LibraryPhoto[]; amenities: { key: string; label: string }[] }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(saveRoomDetails, {});
  const [lang, setLang] = useState<Locale>("sq");
  const [images, setImages] = useState(room.images);
  const [library, setLibrary] = useState(photos);

  const move = (i: number, by: number) =>
    setImages((list) => {
      const next = [...list];
      [next[i], next[i + by]] = [next[i + by], next[i]];
      return next;
    });
  const unused = library.filter((p) => !images.includes(p.src));

  return (
    <form
      className="mt-8 grid gap-8"
      onSubmit={(e) => {
        // Submitting by hand keeps the typed values if the save is rejected
        // (a form action would reset every field to its default).
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
    >
      <input type="hidden" name="id" value={room.id} />
      {images.map((src) => (
        <input key={src} type="hidden" name="images" value={src} />
      ))}

      <section className="rounded-[var(--radius-soft)] border border-line bg-mist p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-sans text-lg font-semibold">Name and description</h2>
          <div role="tablist" aria-label="Language" className="flex rounded-[var(--radius-soft)] border border-line bg-white p-1">
            {LOCALES.map((l) => (
              <button
                key={l}
                type="button"
                role="tab"
                aria-selected={lang === l}
                onClick={() => setLang(l)}
                className={`rounded-[4px] px-3 py-1.5 text-sm font-semibold ${lang === l ? "bg-emerald text-white" : "text-muted hover:text-ink"}`}
              >
                {LOCALE_NAMES[l]}
              </button>
            ))}
          </div>
        </div>
        {/* Every language stays in the form so one Save covers all three. */}
        {LOCALES.map((l) => (
          <div key={l} role="tabpanel" hidden={lang !== l} className="mt-4 grid gap-4 sm:grid-cols-2">
            <TextField label="Name" name={`name.${l}`} lang={l} defaultValue={room.name[l]} />
            <TextField label="Beds" name={`bed.${l}`} lang={l} defaultValue={room.bed[l]} hint="For example “1 double bed”." />
            <TextField label="Short summary" name={`summary.${l}`} lang={l} defaultValue={room.summary[l]} className="sm:col-span-2" hint="One line, shown in room lists." />
            <TextField label="Description" name={`description.${l}`} lang={l} defaultValue={room.description[l]} className="sm:col-span-2" rows={5} />
          </div>
        ))}
      </section>

      <section className="rounded-[var(--radius-soft)] border border-line bg-mist p-5">
        <h2 className="font-sans text-lg font-semibold">Details</h2>
        <div className="mt-4 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <NumberField label="Base price (€)" name="basePrice" defaultValue={room.basePrice} decimal />
          <NumberField label="Rooms" name="inventory" defaultValue={room.inventory} min={0} />
          <NumberField label="Size (m²)" name="sizeM2" defaultValue={room.sizeM2} min={1} />
          <NumberField label="Max adults" name="maxAdults" defaultValue={room.maxAdults} min={1} />
          <NumberField label="Max children" name="maxChildren" defaultValue={room.maxChildren} min={0} />
        </div>
        <label className="mt-4 flex items-center gap-2">
          <input type="checkbox" name="active" defaultChecked={room.active} className="size-4" /> On sale on the website
        </label>
      </section>

      <section className="rounded-[var(--radius-soft)] border border-line bg-mist p-5">
        <h2 className="font-sans text-lg font-semibold">In the room</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {amenities.map((a) => (
            <label key={a.key} className="flex items-center gap-2">
              <input type="checkbox" name="amenities" value={a.key} defaultChecked={room.amenities.includes(a.key)} className="size-4" /> {a.label}
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-[var(--radius-soft)] border border-line bg-mist p-5">
        <h2 className="font-sans text-lg font-semibold">Photos</h2>
        <p className="mt-1 text-sm text-muted">The first photo is the main one. The room page shows the first three, and guests can open them all in a full-screen gallery.</p>
        {images.length === 0 ? (
          <p className="mt-4 text-danger">Choose at least one photo below.</p>
        ) : (
          <ol className="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((src, i) => (
              <li key={src} className="overflow-hidden rounded-[var(--radius-soft)] border border-line bg-white">
                <div className="relative aspect-[4/3]">
                  <Image src={src} alt="" fill sizes="(min-width: 1024px) 14rem, 45vw" className="object-cover" />
                  {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-gold px-2 py-0.5 text-xs font-semibold text-ink">Main</span>}
                </div>
                <div className="flex items-center gap-1 p-1.5">
                  <IconButton label="Move earlier" disabled={i === 0} onClick={() => move(i, -1)}>
                    <path d="M10 3.5 5.5 8l4.5 4.5" />
                  </IconButton>
                  <IconButton label="Move later" disabled={i === images.length - 1} onClick={() => move(i, 1)}>
                    <path d="M6 3.5 10.5 8 6 12.5" />
                  </IconButton>
                  <button type="button" onClick={() => setImages((l) => l.filter((s) => s !== src))} className="ml-auto rounded-[4px] px-2 py-1 text-sm text-danger hover:bg-danger/10">
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}

        <PhotoUpload
          onUploaded={(photo) => {
            setLibrary((l) => [photo, ...l]);
            setImages((l) => [...l, photo.src]);
          }}
        />

        {unused.length > 0 && (
          <>
            <h3 className="mt-6 text-sm font-semibold">Or pick from the photo library</h3>
            <ul className="mt-2 grid gap-2 grid-cols-3 sm:grid-cols-5 lg:grid-cols-7">
              {unused.map((photo) => (
                <li key={photo.src} className="relative">
                  <button
                    type="button"
                    onClick={() => setImages((l) => [...l, photo.src])}
                    className="group relative block aspect-[4/3] w-full overflow-hidden rounded-[4px] border border-line"
                    aria-label={`Add ${photo.name}`}
                    title={photo.name}
                  >
                    <Image src={photo.src} alt="" fill sizes="8rem" className="object-cover transition-opacity group-hover:opacity-70" />
                    <span className="absolute inset-0 grid place-items-center text-2xl font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 [text-shadow:0_1px_4px_rgb(0_0_0/0.6)]">
                      +
                    </span>
                  </button>
                  {photo.uploaded && (
                    <DeletePhoto
                      name={photo.name}
                      onDelete={async () => {
                        const res = await deleteUploadedPhoto(photo.src);
                        if (res.error) return res.error;
                        setLibrary((l) => l.filter((p) => p.src !== photo.src));
                      }}
                    />
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center gap-4 border-t border-line bg-canvas/95 px-1 py-4 backdrop-blur">
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </button>
        {state.error && (
          <p role="alert" className="text-danger">
            {state.error}
          </p>
        )}
        {state.ok && (
          <p role="status" className="font-semibold text-ok">
            {state.ok}
          </p>
        )}
      </div>
    </form>
  );
}

function TextField({
  label,
  name,
  lang,
  defaultValue,
  hint,
  rows,
  className = "",
}: {
  label: string;
  name: string;
  lang: Locale;
  defaultValue: string;
  hint?: string;
  rows?: number;
  className?: string;
}) {
  const id = `f-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {rows ? (
        <textarea id={id} name={name} lang={lang} rows={rows} defaultValue={defaultValue} className="field resize-y" />
      ) : (
        <input id={id} name={name} lang={lang} defaultValue={defaultValue} className="field" />
      )}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function NumberField({ label, name, defaultValue, min, decimal }: { label: string; name: string; defaultValue: number; min?: number; decimal?: boolean }) {
  const id = `f-${name}`;
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {decimal ? (
        <input id={id} name={name} inputMode="decimal" defaultValue={defaultValue} className="field" />
      ) : (
        <input id={id} name={name} type="number" min={min} defaultValue={defaultValue} className="field" />
      )}
    </div>
  );
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="grid size-8 place-items-center rounded-[4px] text-forest hover:bg-mist disabled:text-black/20 disabled:hover:bg-transparent">
      <svg viewBox="0 0 16 16" className="size-4 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2]" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}
