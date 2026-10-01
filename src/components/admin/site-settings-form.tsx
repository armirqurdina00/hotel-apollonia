"use client";

import Image from "next/image";
import { startTransition, useActionState, useState } from "react";
import { saveSiteSettings, type AdminState } from "@/app/admin/actions";
import type { LibraryPhoto } from "@/lib/photos";
import type { Contact, ImageSlot, SiteImages } from "@/lib/settings";
import { PhotoUpload } from "./photo-upload";
import { useAdminI18n } from "./i18n";

/** Homepage photo slots, grouped by the section they appear in. */
const SECTIONS: { key: "hero" | "restaurant" | "meetings" | "gjakova"; slots: ImageSlot[] }[] = [
  { key: "hero", slots: ["hero"] },
  { key: "restaurant", slots: ["restaurantMain", "restaurantTop", "restaurantBottom", "restaurantWide"] },
  { key: "meetings", slots: ["meetings"] },
  { key: "gjakova", slots: ["gjakovaMain", "gjakovaTop", "gjakovaBottom"] },
];

export function SiteSettingsForm({ contact, images: saved, defaults, photos }: { contact: Contact; images: SiteImages; defaults: SiteImages; photos: LibraryPhoto[] }) {
  const { t } = useAdminI18n();
  const e = t.settings;
  const [state, action, pending] = useActionState<AdminState, FormData>(saveSiteSettings, {});
  const [images, setImages] = useState(saved);
  const [library, setLibrary] = useState(photos);
  const [picking, setPicking] = useState<ImageSlot | null>(null);

  const field = (name: keyof Contact, props: { hint?: string; type?: string; className?: string; placeholder?: string } = {}) => (
    <div className={props.className}>
      <label htmlFor={`s-${name}`} className="field-label">
        {e.fields[name]}
      </label>
      <input id={`s-${name}`} name={name} type={props.type ?? "text"} defaultValue={contact[name]} placeholder={props.placeholder} className="field" />
      {props.hint && <p className="mt-1 text-xs text-muted">{props.hint}</p>}
    </div>
  );

  return (
    <form
      className="mt-8 grid gap-8"
      // Our own checks give messages in the panel's language; the browser's would not.
      noValidate
      onSubmit={(ev) => {
        // Submitting by hand keeps typed values if the save is rejected.
        ev.preventDefault();
        const data = new FormData(ev.currentTarget);
        startTransition(() => action(data));
      }}
    >
      {Object.entries(images).map(([slot, src]) => (
        <input key={slot} type="hidden" name={`image.${slot}`} value={src} />
      ))}

      <section className="rounded-[var(--radius-soft)] border border-line bg-mist p-5">
        <h2 className="font-sans text-lg font-semibold">{e.contact}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {field("phone", { type: "tel" })}
          {field("barPhone", { type: "tel" })}
          {field("whatsapp", { type: "tel", hint: e.whatsappHint })}
          {field("email", { type: "email" })}
          {field("instagram", { type: "url", hint: e.socialHint, placeholder: "https://www.instagram.com/…" })}
          {field("facebook", { type: "url", hint: e.socialHint, placeholder: "https://www.facebook.com/…" })}
          {field("street")}
          {field("postalCode")}
          {field("city")}
          {field("country")}
          {field("mapsQuery", { hint: e.mapsHint, className: "sm:col-span-2" })}
        </div>
      </section>

      <section className="rounded-[var(--radius-soft)] border border-line bg-mist p-5">
        <h2 className="font-sans text-lg font-semibold">{e.photos}</h2>
        <p className="mt-1 text-sm text-muted">{e.photosLead}</p>
        <div className="mt-5 space-y-6">
          {SECTIONS.map((section) => (
            <div key={section.key}>
              <h3 className="text-sm font-semibold uppercase tracking-[0.06em] text-muted">{e.sections[section.key]}</h3>
              <ul className="mt-2 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {section.slots.map((slot) => (
                  <li key={slot} className={`overflow-hidden rounded-[var(--radius-soft)] border bg-white ${picking === slot ? "border-emerald ring-2 ring-emerald/30" : "border-line"}`}>
                    <div className="relative aspect-[4/3] bg-line">
                      <Image src={images[slot]} alt="" fill sizes="(min-width: 1024px) 14rem, 45vw" className="object-cover" />
                    </div>
                    <div className="p-2.5">
                      <p className="text-sm font-semibold">{e.slots[slot]}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <button type="button" onClick={() => setPicking(picking === slot ? null : slot)} className="text-sm font-semibold text-emerald hover:underline">
                          {picking === slot ? e.close : e.change}
                        </button>
                        {images[slot] !== defaults[slot] && (
                          <button type="button" onClick={() => setImages((im) => ({ ...im, [slot]: defaults[slot] }))} className="text-sm text-muted hover:text-ink hover:underline">
                            {e.reset}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {picking && section.slots.includes(picking) && (
                <div className="mt-3 rounded-[var(--radius-soft)] border border-line bg-white p-4">
                  <p className="text-sm font-semibold">
                    {e.pick}: <span className="text-emerald">{e.slots[picking]}</span>
                  </p>
                  <ul className="mt-3 grid max-h-80 gap-2 overflow-y-auto grid-cols-3 sm:grid-cols-5 lg:grid-cols-7">
                    {library.map((photo) => (
                      <li key={photo.src}>
                        <button
                          type="button"
                          onClick={() => {
                            setImages((im) => ({ ...im, [picking]: photo.src }));
                            setPicking(null);
                          }}
                          aria-label={photo.name}
                          title={photo.name}
                          className={`relative block aspect-[4/3] w-full overflow-hidden rounded-[4px] border hover:opacity-80 ${images[picking] === photo.src ? "border-emerald ring-2 ring-emerald" : "border-line"}`}
                        >
                          <Image src={photo.src} alt="" fill sizes="8rem" className="object-cover" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <PhotoUpload
                    onUploaded={(photo) => {
                      setLibrary((l) => [photo, ...l]);
                      setImages((im) => ({ ...im, [picking]: photo.src }));
                      setPicking(null);
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center gap-4 border-t border-line bg-canvas/95 px-1 py-4 backdrop-blur">
        <button className="btn btn-primary" disabled={pending}>
          {pending ? t.saving : t.saveChanges}
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
