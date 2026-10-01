"use client";

import { useActionState } from "react";
import { loginAction, type AdminState } from "../actions";
import { useAdminI18n } from "@/components/admin/i18n";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(loginAction, {});
  const { t } = useAdminI18n();
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="pw" className="field-label">
          {t.login.password}
        </label>
        <input id="pw" name="password" type="password" autoComplete="current-password" required autoFocus className="field" aria-invalid={state.error ? true : undefined} />
        {state.error && <p className="mt-1 text-sm text-danger">{state.error}</p>}
      </div>
      <button className="btn btn-primary" disabled={pending}>
        {t.login.submit}
      </button>
    </form>
  );
}
