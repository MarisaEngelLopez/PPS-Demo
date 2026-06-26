"use client";

import { useTranslation } from "@/components/i18n/TranslationProvider";

export function PrintButton() {
  const { t } = useTranslation();

  return (
    <button type="button" onClick={() => window.print()}>
      {t("actions.printSavePdf")}
    </button>
  );
}
