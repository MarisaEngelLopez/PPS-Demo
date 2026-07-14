"use client";

import { createContext, useContext } from "react";
import { translate, type TranslationKey } from "@/lib/i18n/dictionaries";
import { defaultLocale, type AppLocale } from "@/lib/i18n/locales";

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
  return (
    <TranslationContext.Provider
      value={{ locale: initialLocale, t: (key) => translate(initialLocale, key) }}
    >
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  return useContext(TranslationContext);
}
