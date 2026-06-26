"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useTranslation } from "@/components/i18n/TranslationProvider";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import {
  buttonStyle,
  sectionHeaderStyle,
  sectionTitleStyle,
} from "@/components/ui/layoutStyles";

type SectionHeaderProps = {
  title: ReactNode;
  action?: ReactNode;
};

type SectionHeaderActionsProps = {
  children: ReactNode;
};

type SectionHeaderActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  inactive?: boolean;
  labelKey?: TranslationKey;
};

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <div style={sectionHeaderStyle}>
      <div style={sectionTitleStyle}>{title}</div>
      {action}
    </div>
  );
}

export function SectionHeaderActions({ children }: SectionHeaderActionsProps) {
  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
      {children}
    </div>
  );
}

export function SectionHeaderActionButton({
  children,
  disabled,
  inactive,
  labelKey,
  style,
  ...props
}: SectionHeaderActionButtonProps) {
  const isDimmed = Boolean(disabled || inactive);
  const { t } = useTranslation();

  return (
    <button
      type="button"
      disabled={disabled}
      style={{
        ...buttonStyle,
        opacity: isDimmed ? 0.65 : 1,
        cursor: disabled ? "default" : buttonStyle.cursor,
        ...style,
      }}
      {...props}
    >
      {labelKey ? t(labelKey) : children}
    </button>
  );
}
