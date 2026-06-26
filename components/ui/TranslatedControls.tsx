"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useTranslation } from "@/components/i18n/TranslationProvider";
import { tableButtonStyle } from "@/components/ui/layoutStyles";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

type TranslatedTableButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: ReactNode;
  labelKey?: TranslationKey;
};

export function TranslatedText({
  labelKey,
}: {
  labelKey: TranslationKey;
}) {
  const { t } = useTranslation();

  return <>{t(labelKey)}</>;
}

export function TranslatedButtonLabel({
  labelKey,
}: {
  labelKey: TranslationKey;
}) {
  return <TranslatedText labelKey={labelKey} />;
}

export function TranslatedTableButton({
  children,
  labelKey,
  style,
  ...props
}: TranslatedTableButtonProps) {
  const { t } = useTranslation();

  return (
    <button type="button" style={{ ...tableButtonStyle, ...style }} {...props}>
      {labelKey ? t(labelKey) : children}
    </button>
  );
}
