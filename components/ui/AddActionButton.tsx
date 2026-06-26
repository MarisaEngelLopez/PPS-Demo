"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useTranslation } from "@/components/i18n/TranslationProvider";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import {
  addActionButtonStyle,
  addActionPlusStyle,
} from "@/components/ui/layoutStyles";

type AddActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: ReactNode;
  labelKey?: TranslationKey;
};

export function AddActionButton({
  children,
  labelKey,
  ...props
}: AddActionButtonProps) {
  const { locale, t } = useTranslation();
  const label = labelKey
    ? t(labelKey)
    : typeof children === "string"
      ? translateActionChild(children, locale)
      : children;

  return (
    <button type="button" style={addActionButtonStyle} {...props}>
      <span style={addActionPlusStyle} aria-hidden="true">
        +
      </span>
      <span>{label}</span>
    </button>
  );
}

function translateActionChild(value: string, locale: string) {
  if (locale !== "es") return value;
  const exactTranslations: Record<string, string> = {
    "Add Action": "A\u00f1adir acci\u00f3n",
    "Add Assessment": "A\u00f1adir evaluaci\u00f3n",
    "Add Evidence": "A\u00f1adir evidencia",
    "Add Review": "A\u00f1adir revisi\u00f3n",
    "Add Subtask": "A\u00f1adir subtarea",
    "Add Task": "A\u00f1adir tarea",
    "Add Workstream": "A\u00f1adir workstream",
    "New Decision": "Nueva decisi\u00f3n",
    "New Event Type": "Nuevo tipo de evento",
    "New Evidence Type": "Nuevo tipo de evidencia",
    "New Organization": "Nueva organizaci\u00f3n",
    "New Phase": "Nueva fase",
    "New Project": "Nuevo proyecto",
    "New Project Template": "Nueva plantilla de proyecto",
    "New Project Type": "Nuevo tipo de proyecto",
    "New Risk": "Nuevo riesgo",
    "New Status": "Nuevo estado",
    "New Status Scope": "Nuevo \u00e1mbito de estado",
    "New Status Usage": "Nuevo uso de estado",
    "New Task Family": "Nueva familia de tarea",
    "New Template Workstream": "Nuevo workstream de plantilla",
    "New Time Tracking Record": "Nuevo registro de tiempo",
    "New Workstream": "Nuevo workstream",
  };
  if (exactTranslations[value]) return exactTranslations[value];
  if (value.startsWith("Add ")) return value.replace(/^Add /, "A\u00f1adir ");
  if (value.startsWith("New ")) return value.replace(/^New /, "Nuevo ");
  return value;
}
