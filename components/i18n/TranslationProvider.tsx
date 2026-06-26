"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import { translate, type TranslationKey } from "@/lib/i18n/dictionaries";
import {
  defaultLocale,
  isAppLocale,
  localeCookieName,
  type AppLocale,
} from "@/lib/i18n/locales";

type TranslationContextValue = {
  locale: AppLocale;
  t: (key: TranslationKey) => string;
};

const TranslationContext = createContext<TranslationContextValue>({
  locale: defaultLocale,
  t: (key) => translate(defaultLocale, key),
});

export function TranslationProvider({
  children,
  initialLocale = defaultLocale,
}: {
  children: React.ReactNode;
  initialLocale?: AppLocale;
}) {
  const locale = useSyncExternalStore(
    subscribeToLocale,
    getBrowserLocale,
    () => initialLocale
  );

  return (
    <TranslationContext.Provider
      value={{ locale, t: (key) => translate(locale, key) }}
    >
      {children}
    </TranslationContext.Provider>
  );
}

function subscribeToLocale() {
  return () => undefined;
}

function getBrowserLocale() {
  if (typeof document === "undefined") return defaultLocale;

  const cookieLocale = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${localeCookieName}=`))
    ?.split("=")[1];

  return isAppLocale(cookieLocale) ? cookieLocale : defaultLocale;
}

export function useTranslation() {
  return useContext(TranslationContext);
}
