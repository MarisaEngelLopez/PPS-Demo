import { prisma } from "@/lib/prisma";
import {
  normalizeEventTypeCode,
  normalizeEventTypeSortOrder,
  normalizeEventTypeText,
} from "./eventTypeRules";
import type { EventTypeActionResult } from "./eventTypeTypes";

export type ParsedEventTypeInput = {
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
};

export function eventTypeOk(message: string): EventTypeActionResult {
  return { ok: true, message };
}

export function eventTypeError(message: string): EventTypeActionResult {
  return { ok: false, message };
}

export function parseEventTypeInput(formData: FormData): ParsedEventTypeInput {
  const description = normalizeEventTypeText(formData.get("description"));

  return {
    code: normalizeEventTypeCode(formData.get("code")),
    name: normalizeEventTypeText(formData.get("name")),
    description: description || null,
    sortOrder: normalizeEventTypeSortOrder(formData.get("sortOrder")),
  };
}

export async function validateEventTypeInput(
  input: ParsedEventTypeInput,
  existingId?: string
) {
  if (!input.code || !input.name) {
    return eventTypeError("Event type not saved: code and name are required.");
  }

  const duplicate = await prisma.eventType.findFirst({
    where: {
      code: input.code,
      ...(existingId ? { NOT: { id: existingId } } : {}),
    },
  });

  if (duplicate) {
    return eventTypeError("Event type not saved: code already exists.");
  }

  return null;
}
