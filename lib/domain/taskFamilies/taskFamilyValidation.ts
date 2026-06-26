import { prisma } from "@/lib/prisma";
import {
  normalizeTaskFamilyCode,
  normalizeTaskFamilySortOrder,
  normalizeTaskFamilyText,
} from "./taskFamilyRules";
import type { TaskFamilyActionResult } from "./taskFamilyTypes";

export type ParsedTaskFamilyInput = {
  code: string;
  name: string;
  nameEs: string | null;
  sortOrder: number;
};

export function taskFamilyOk(message: string): TaskFamilyActionResult {
  return { ok: true, message };
}

export function taskFamilyError(message: string): TaskFamilyActionResult {
  return { ok: false, message };
}

export function parseTaskFamilyInput(formData: FormData): ParsedTaskFamilyInput {
  const nameEs = normalizeTaskFamilyText(formData.get("nameEs"));

  return {
    code: normalizeTaskFamilyCode(formData.get("code")),
    name: normalizeTaskFamilyText(formData.get("name")),
    nameEs: nameEs || null,
    sortOrder: normalizeTaskFamilySortOrder(formData.get("sortOrder")),
  };
}

export async function validateTaskFamilyInput(
  input: ParsedTaskFamilyInput,
  existingId?: string
) {
  if (!input.code || !input.name) {
    return taskFamilyError("Task family not saved: code and name are required.");
  }

  const duplicate = await prisma.taskFamily.findFirst({
    where: {
      code: input.code,
      ...(existingId ? { NOT: { id: existingId } } : {}),
    },
  });

  if (duplicate) {
    return taskFamilyError("Task family not saved: code already exists.");
  }

  return null;
}
