"use client";

import { useActionState } from "react";
import { loginAction, type AdminState } from "../actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(loginAction, {});
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="pw" className="field-label">
          Password
        </label>
        <input id="pw" name="password" type="password" autoComplete="current-password" required autoFocus className="field" aria-invalid={state.error ? true : undefined} />
        {state.error && <p className="mt-1 text-sm text-danger">{state.error}</p>}
      </div>
      <button className="btn btn-primary" disabled={pending}>
        Sign in
      </button>
    </form>
  );
}
