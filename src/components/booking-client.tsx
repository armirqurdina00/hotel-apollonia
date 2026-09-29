"use client";

import { useActionState, useState } from "react";
import { cancelBookingAction, findBookingAction, type FormState } from "@/app/[lang]/actions";

export function CancelBooking({
  lang,
  refCode,
  token,
  labels,
}: {
  lang: string;
  refCode: string;
  token: string;
  labels: { cancel: string; confirm: string; keep: string; question: string; tooLate: string; generic: string };
}) {
  const [asking, setAsking] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(cancelBookingAction, {});

  if (state.error) {
    return (
      <p role="alert" className="text-danger">
        {state.error === "too_late" ? labels.tooLate : labels.generic}
      </p>
    );
  }
  if (!asking) {
    return (
      <button type="button" className="btn btn-ghost text-danger" onClick={() => setAsking(true)}>
        {labels.cancel}
      </button>
    );
  }
  return (
    <form action={action} className="rounded-[var(--radius-soft)] border border-danger/40 bg-white p-5">
      <input type="hidden" name="ref" value={refCode} />
      <input type="hidden" name="t" value={token} />
      <input type="hidden" name="lang" value={lang} />
      <p>{labels.question}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="submit" className="btn bg-danger text-white hover:bg-danger/90" disabled={pending}>
          {labels.confirm}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setAsking(false)}>
          {labels.keep}
        </button>
      </div>
    </form>
  );
}

export function FindBookingForm({ lang, labels }: { lang: string; labels: { ref: string; email: string; submit: string; notFound: string } }) {
  const [state, action, pending] = useActionState<FormState, FormData>(findBookingAction, {});
  return (
    <form action={action} className="grid gap-5">
      {state.error && (
        <p role="alert" className="rounded-[var(--radius-soft)] border border-danger/40 bg-white p-4 text-danger">
          {labels.notFound}
        </p>
      )}
      <input type="hidden" name="lang" value={lang} />
      <div>
        <label htmlFor="fb-ref" className="field-label">
          {labels.ref}
        </label>
        <input id="fb-ref" name="ref" required placeholder="APL-XXXXXX" defaultValue={state.values?.ref} className="field uppercase" autoCapitalize="characters" />
      </div>
      <div>
        <label htmlFor="fb-email" className="field-label">
          {labels.email}
        </label>
        <input id="fb-email" name="email" type="email" required autoComplete="email" defaultValue={state.values?.email} className="field" />
      </div>
      <button type="submit" className="btn btn-primary sm:w-fit" disabled={pending}>
        {labels.submit}
      </button>
    </form>
  );
}
