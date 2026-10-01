"use client";

import { useRef, useState } from "react";
import { uploadRoomPhoto } from "@/app/admin/actions";
import type { LibraryPhoto } from "@/lib/photos";
import { fill, plural } from "@/i18n/config";
import { useAdminI18n } from "./i18n";

const MAX_EDGE = 2000;

/**
 * Re-encodes a photo as a JPEG no larger than MAX_EDGE on its long side, so
 * uploads stay small (about 0.3–0.8 MB) and phone photos are upright.
 */
async function shrink(file: File) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("encode failed");
  return { blob, width, height };
}

export function PhotoUpload({ onUploaded }: { onUploaded: (photo: LibraryPhoto) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const { lang, t } = useAdminI18n();
  const u = t.upload;

  async function upload(files: File[]) {
    const photos = files.filter((f) => f.type.startsWith("image/") || /\.hei[cf]$/i.test(f.name));
    if (photos.length === 0) return setMessage({ tone: "error", text: u.notPhotos });
    setMessage(null);
    const failed: string[] = [];
    for (let i = 0; i < photos.length; i++) {
      setBusy({ done: i, total: photos.length });
      const file = photos[i];
      try {
        const { blob, width, height } = await shrink(file);
        const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
        const data = new FormData();
        data.set("file", blob, name);
        data.set("filename", name);
        data.set("width", String(width));
        data.set("height", String(height));
        const res = await uploadRoomPhoto(data);
        if (res.src) onUploaded({ src: res.src, name, uploaded: true });
        else failed.push(`${file.name}: ${res.error}`);
      } catch {
        failed.push(`${file.name}: ${u.unreadable}`);
      }
    }
    setBusy(null);
    const ok = photos.length - failed.length;
    if (failed.length) setMessage({ tone: "error", text: (ok ? fill(u.partial, { n: ok }) : "") + fill(u.failed, { list: failed.join("; ") }) });
    else setMessage({ tone: "ok", text: plural(lang, u.done, ok) });
  }

  return (
    <div className="mt-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!busy) upload([...e.dataTransfer.files]);
        }}
        className={`flex flex-col items-center gap-3 rounded-[var(--radius-soft)] border-2 border-dashed px-4 py-7 text-center transition-colors ${dragging ? "border-emerald bg-emerald/5" : "border-line bg-white"}`}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-8 fill-none stroke-emerald [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.6]">
          <path d="M12 15V4m0 0L7.5 8.5M12 4l4.5 4.5" />
          <path d="M4 14.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3.5" />
        </svg>
        {busy ? (
          <p className="font-semibold" role="status">
            {fill(u.progress, { i: busy.done + 1, n: busy.total })}
          </p>
        ) : (
          <>
            <p>
              <button type="button" onClick={() => input.current?.click()} className="btn btn-primary !min-h-10 !py-2">
                {u.button}
              </button>
            </p>
            <p className="text-sm text-muted">{u.hint}</p>
          </>
        )}
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            const files = [...(e.target.files ?? [])];
            e.target.value = "";
            if (files.length) upload(files);
          }}
        />
      </div>
      {message && (
        <p role={message.tone === "error" ? "alert" : "status"} className={`mt-2 text-sm ${message.tone === "error" ? "text-danger" : "text-ok font-semibold"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}

/** Small delete control for an uploaded photo, with a second click to confirm. */
export function DeletePhoto({ name, onDelete }: { name: string; onDelete: () => Promise<string | void> }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { t } = useAdminI18n();
  const u = t.upload;
  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          if (!confirming) return setConfirming(true);
          setBusy(true);
          const err = await onDelete();
          setBusy(false);
          setConfirming(false);
          if (err) setError(err);
        }}
        onBlur={() => setConfirming(false)}
        aria-label={fill(confirming ? u.confirmDelete : u.delete, { name })}
        title={confirming ? u.confirmTitle : u.deleteTitle}
        className={`absolute right-1 top-1 rounded-full text-xs font-semibold shadow ${confirming ? "bg-danger px-2 py-1 text-white" : "grid size-6 place-items-center bg-white/95 text-danger hover:bg-white"}`}
      >
        {confirming ? u.deleteShort : "×"}
      </button>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </>
  );
}
