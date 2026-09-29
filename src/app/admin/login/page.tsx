import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/admin";
  return (
    <div className="min-h-dvh grid place-items-center p-4 crest">
      <div className="w-full max-w-sm rounded-[var(--radius-soft)] bg-canvas text-ink p-8 shadow-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo.png" alt="Hotel Apollonia" className="mx-auto h-28 w-auto" />
        <h1 className="font-sans text-base font-semibold mt-5 mb-6 text-muted text-center">Staff sign in</h1>
        <LoginForm next={next} />
      </div>
    </div>
  );
}
