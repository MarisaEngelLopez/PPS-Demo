import { prisma } from "@/lib/prisma";
import {
  normalizeProjectTypeCode,
  normalizeProjectTypeSortOrder,
  normalizeProjectTypeText,
} from "./projectTypeRules";
import type { ProjectTypeActionResult } from "./projectTypeTypes";

export type ParsedProjectTypeInput = {
  code: string;
  name: string;
  nameEs: string | null;
  description: string | null;
  descriptionEs: string | null;
  sortOrder: number;
};

export function projectTypeOk(message: string): ProjectTypeActionResult {
  return { ok: true, message };
}

export function projectTypeError(message: string): ProjectTypeActionResult {
  return { ok: false, message };
}

export function parseProjectTypeInput(formData: FormData): ParsedProjectTypeInput {
  const nameEs = normalizeProjectTypeText(formData.get("nameEs"));
  const description = normalizeProjectTypeText(formData.get("description"));
  const descriptionEs = normalizeProjectTypeText(formData.get("descriptionEs"));

  return {
    code: normalizeProjectTypeCode(formData.get("code")),
    name: normalizeProjectTypeText(formData.get("name")),
    nameEs: nameEs || null,
    description: description || null,
    descriptionEs: descriptionEs || null,
    sortOrder: normalizeProjectTypeSortOrder(formData.get("sortOrder")),
  };
}

export async function validateProjectTypeInput(
  input: ParsedProjectTypeInput,
  existingId?: string
) {
  if (!input.code || !input.name) {
    return projectTypeError("Project type not saved: code and name are required.");
  }

  const duplicate = await prisma.projectType.findFirst({
    where: {
      code: input.code,
      ...(existingId ? { NOT: { id: existingId } } : {}),
    },
  });

  if (duplicate) {
    return projectTypeError("Project type not saved: code already exists.");
  }

  return null;
}
