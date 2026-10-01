"use client";

import Image from "next/image";
import { startTransition, useActionState, useRef, useState } from "react";
import { deleteUploadedPhoto, saveRoomDetails, translateRoomText, type AdminState, type RoomText } from "@/app/admin/actions";
import type { LibraryPhoto } from "@/lib/photos";
import { DeletePhoto, PhotoUpload } from "./photo-upload";
import { useAdminI18n } from "./i18n";
import { fill } from "@/i18n/config";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/i18n/config";

type Localized = Record<Locale, string>;

export type RoomFormValues = {
  /** 0 for a room type that doesn't exist yet. */
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
  // The language tab being edited (room text exists in all three site languages).
  const [lang, setLang] = useState<Locale>("sq");
  const { t } = useAdminI18n();
  const r = t.room;
  const [images, setImages] = useState(room.images);
  const [library, setLibrary] = useState(photos);
  const form = useRef<HTMLFormElement>(null);
  const [translating, setTranslating] = useState(false);
  const [translateMsg, setTranslateMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  // The text fields are uncontrolled, so translations are written straight into them.
  const textField = (name: string) => form.current?.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
  const TEXT_FIELDS = ["name", "bed", "summary", "description"] as const;

  async function translateFromAlbanian() {
    const sq = Object.fromEntries(TEXT_FIELDS.map((f) => [f, textField(`${f}.sq`)?.value ?? ""])) as RoomText;
    setTranslating(true);
    setTranslateMsg(null);
    const res = await translateRoomText(sq);
    setTranslating(false);
    if (res.error || !res.en || !res.de) return setTranslateMsg({ tone: "error", text: res.error ?? r.translateFailed });
    for (const l of ["en", "de"] as const)
      for (const f of TEXT_FIELDS) {
        const el = textField(`${f}.${l}`);
        if (el) el.value = res[l]![f];
      }
    setTranslateMsg({ tone: "ok", text: r.translated });
  }

  const move = (i: number, by: number) =>
    setImages((list) => {
      const next = [...list];
      [next[i], next[i + by]] = [next[i + by], next[i]];
      return next;
    });
  const unused = library.filter((p) => !images.includes(p.src));

  return (
    <form
      ref={form}
      className="mt-8 grid gap-8"
      onSubmit={(e) => {
        // Submitting by hand keeps the typed values if the save is rejected
        // (a form action would reset every field to its default).
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
    >
      {room.id > 0 && <input type="hidden" name="id" value={room.id} />}
      {images.map((src) => (
        <input key={src} type="hidden" name="images" value={src} />
      ))}

      <section className="rounded-[var(--radius-soft)] border border-line bg-mist p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-sans text-lg font-semibold">{r.nameAndDescription}</h2>
          <div role="tablist" aria-label={r.language} className="flex rounded-[var(--radius-soft)] border border-line bg-white p-1">
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
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[var(--radius-soft)] border border-dashed border-line bg-white px-4 py-3">
          <button type="button" onClick={translateFromAlbanian} disabled={translating} className="btn btn-ghost !min-h-10 !py-1.5 text-sm">
            {translating ? r.translating : r.translate}
          </button>
          {translateMsg ? (
            <p role={translateMsg.tone === "error" ? "alert" : "status"} className={`text-sm ${translateMsg.tone === "error" ? "text-danger" : "font-semibold text-ok"}`}>
              {translateMsg.text}
            </p>
          ) : (
            <p className="text-sm text-muted">{r.translateHint}</p>
          )}
        </div>
        {/* Every language stays in the form so one Save covers all three. */}
        {LOCALES.map((l) => (
          <div key={l} role="tabpanel" hidden={lang !== l} className="mt-4 grid gap-4 sm:grid-cols-2">
            <TextField label={r.name} name={`name.${l}`} lang={l} defaultValue={room.name[l]} />
            <TextField label={r.beds} name={`bed.${l}`} lang={l} defaultValue={room.bed[l]} hint={r.bedsHint} />
            <TextField label={r.summary} name={`summary.${l}`} lang={l} defaultValue={room.summary[l]} className="sm:col-span-2" hint={r.summaryHint} />
            <TextField label={r.description} name={`description.${l}`} lang={l} defaultValue={room.description[l]} className="sm:col-span-2" rows={5} />
          </div>
        ))}
      </section>

      <section className="rounded-[var(--radius-soft)] border border-line bg-mist p-5">
        <h2 className="font-sans text-lg font-semibold">{r.details}</h2>
        <div className="mt-4 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <NumberField label={r.basePrice} name="basePrice" defaultValue={room.basePrice} decimal />
          <NumberField label={r.rooms} name="inventory" defaultValue={room.inventory} min={0} />
          <NumberField label={r.size} name="sizeM2" defaultValue={room.sizeM2} min={1} />
          <NumberField label={r.maxAdults} name="maxAdults" defaultValue={room.maxAdults} min={1} />
          <NumberField label={r.maxChildren} name="maxChildren" defaultValue={room.maxChildren} min={0} />
        </div>
        <label className="mt-4 flex items-center gap-2">
          <input type="checkbox" name="active" defaultChecked={room.active} className="size-4" /> {r.onSale}
        </label>
      </section>

      <section className="rounded-[var(--radius-soft)] border border-line bg-mist p-5">
        <h2 className="font-sans text-lg font-semibold">{r.inRoom}</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {amenities.map((a) => (
            <label key={a.key} className="flex items-center gap-2">
              <input type="checkbox" name="amenities" value={a.key} defaultChecked={room.amenities.includes(a.key)} className="size-4" /> {a.label}
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-[var(--radius-soft)] border border-line bg-mist p-5">
        <h2 className="font-sans text-lg font-semibold">{r.photos}</h2>
        <p className="mt-1 text-sm text-muted">{r.photosLead}</p>
        {images.length === 0 ? (
          <p className="mt-4 text-danger">{r.noPhotos}</p>
        ) : (
          <ol className="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((src, i) => (
              <li key={src} className="overflow-hidden rounded-[var(--radius-soft)] border border-line bg-white">
                <div className="relative aspect-[4/3]">
                  <Image src={src} alt="" fill sizes="(min-width: 1024px) 14rem, 45vw" className="object-cover" />
                  {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-gold px-2 py-0.5 text-xs font-semibold text-ink">{r.main}</span>}
                </div>
                <div className="flex items-center gap-1 p-1.5">
                  <IconButton label={r.moveEarlier} disabled={i === 0} onClick={() => move(i, -1)}>
                    <path d="M10 3.5 5.5 8l4.5 4.5" />
                  </IconButton>
                  <IconButton label={r.moveLater} disabled={i === images.length - 1} onClick={() => move(i, 1)}>
                    <path d="M6 3.5 10.5 8 6 12.5" />
                  </IconButton>
                  <button type="button" onClick={() => setImages((l) => l.filter((s) => s !== src))} className="ml-auto rounded-[4px] px-2 py-1 text-sm text-danger hover:bg-danger/10">
                    {r.remove}
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
            <h3 className="mt-6 text-sm font-semibold">{r.library}</h3>
            <ul className="mt-2 grid gap-2 grid-cols-3 sm:grid-cols-5 lg:grid-cols-7">
              {unused.map((photo) => (
                <li key={photo.src} className="relative">
                  <button
                    type="button"
                    onClick={() => setImages((l) => [...l, photo.src])}
                    className="group relative block aspect-[4/3] w-full overflow-hidden rounded-[4px] border border-line"
                    aria-label={fill(r.add, { name: photo.name })}
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
          {pending ? t.saving : room.id ? t.saveChanges : r.create}
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
