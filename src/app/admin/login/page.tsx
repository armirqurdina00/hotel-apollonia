import { getAdminI18n } from "@/lib/admin";
import { AdminLangSwitch } from "@/components/admin/lang-switch";
import { LoginForm } from "./login-form";

export async function generateMetadata() {
  const { t } = await getAdminI18n();
  return { title: t.login.title };
}

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/admin";
  const { lang, t } = await getAdminI18n();
  return (
    <div className="min-h-dvh grid place-items-center p-4 crest">
      <div className="w-full max-w-sm rounded-[var(--radius-soft)] bg-canvas text-ink p-8 shadow-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo.png" alt="Hotel Apollonia" className="mx-auto h-28 w-auto" />
        <h1 className="font-sans text-base font-semibold mt-5 mb-6 text-muted text-center">{t.login.heading}</h1>
        <LoginForm next={next} />
        <div className="mt-6 flex justify-center">
          <AdminLangSwitch lang={lang} tone="light" />
        </div>
      </div>
    </div>
  );
}
