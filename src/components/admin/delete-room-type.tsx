"use client";

import { useState, useTransition } from "react";
import { deleteRoomType } from "@/app/admin/actions";
import { useAdminI18n } from "./i18n";

/** Two-click delete for a room type nobody has booked. */
export function DeleteRoomType({ id }: { id: number }) {
  const { t } = useAdminI18n();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onBlur={() => setConfirming(false)}
        onClick={() => {
          if (!confirming) return setConfirming(true);
          start(async () => {
            const res = await deleteRoomType(id);
            if (res?.error) setError(res.error);
            setConfirming(false);
          });
        }}
        className={`btn ${confirming ? "bg-danger text-white" : "btn-ghost text-danger"}`}
      >
        {confirming ? t.room.deleteConfirm : t.room.deleteButton}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
