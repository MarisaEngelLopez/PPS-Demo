export const supportedLocales = ["en", "es"] as const;

export type AppLocale = (typeof supportedLocales)[number];

export const defaultLocale: AppLocale = "en";

export const localeCookieName = "project_ops_locale";

export const localeLabels: Record<AppLocale, string> = {
  en: "English",
  es: "Español",
};

export function isAppLocale(value: string | undefined): value is AppLocale {
  return supportedLocales.some((locale) => locale === value);
}
