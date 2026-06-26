import { cookies } from "next/headers";
import {
  defaultLocale,
  isAppLocale,
  localeCookieName,
  type AppLocale,
} from "@/lib/i18n/locales";

export async function getServerLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const locale = cookieStore.get(localeCookieName)?.value;

  return isAppLocale(locale) ? locale : defaultLocale;
}
