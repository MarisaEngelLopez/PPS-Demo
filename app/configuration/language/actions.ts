"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  defaultLocale,
  isAppLocale,
  localeCookieName,
} from "@/lib/i18n/locales";

export async function updateApplicationLanguage(formData: FormData) {
  const localeInput = String(formData.get("locale") ?? "");
  const locale = isAppLocale(localeInput) ? localeInput : defaultLocale;
  const cookieStore = await cookies();

  cookieStore.set(localeCookieName, locale, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect("/configuration/language");
}
