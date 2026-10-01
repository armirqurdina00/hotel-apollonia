"use client";

import { createContext, useContext } from "react";
import { ADMIN_DICTIONARIES, type AdminLang } from "@/i18n/admin";

const AdminI18n = createContext<AdminLang>("sq");

/** Gives the staff panel's client components its language; set in the admin root layout. */
export function AdminI18nProvider({ lang, children }: { lang: AdminLang; children: React.ReactNode }) {
  return <AdminI18n.Provider value={lang}>{children}</AdminI18n.Provider>;
}

export function useAdminI18n() {
  const lang = useContext(AdminI18n);
  return { lang, t: ADMIN_DICTIONARIES[lang] };
}
