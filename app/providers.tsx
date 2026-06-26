"use client";

import { ToastProvider } from "@/components/ui/ToastProvider";
import { TranslationProvider } from "@/components/i18n/TranslationProvider";
import type { AppLocale } from "@/lib/i18n/locales";

export function Providers({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale: AppLocale;
}) {
  return (
    <TranslationProvider initialLocale={initialLocale}>
      <ToastProvider>{children}</ToastProvider>
    </TranslationProvider>
  );
}
