import { prisma } from "@/lib/prisma";
import {
  normalizeSortOrder,
  normalizeStatusCode,
  normalizeStatusText,
} from "./statusRules";
import type { StatusActionResult } from "./statusTypes";

export type ParsedStatusInput = {
  code: string;
  name: string;
  nameEs: string | null;
  sortOrder: number;
};

export function actionOk(message: string): StatusActionResult {
  return { ok: true, message };
}

export function actionError(message: string): StatusActionResult {
  return { ok: false, message };
}

export function parseStatusInput(formData: FormData): ParsedStatusInput {
  const nameEs = normalizeStatusText(formData.get("nameEs"));

  return {
    code: normalizeStatusCode(formData.get("code")),
    name: normalizeStatusText(formData.get("name")),
    nameEs: nameEs || null,
    sortOrder: normalizeSortOrder(formData.get("sortOrder")),
  };
}

export async function validateStatusInput(
  input: ParsedStatusInput,
  existingId?: string
) {
  if (!input.code || !input.name) {
    return actionError("Status not saved: code and name are required.");
  }

  const duplicate = await prisma.status.findFirst({
    where: {
      code: input.code,
      ...(existingId ? { NOT: { id: existingId } } : {}),
    },
  });

  if (duplicate) {
    return actionError("Status not saved: code already exists.");
  }

  return null;
}

export type ParsedStatusScopeInput = {
  code: string;
  name: string;
  sortOrder: number;
  inheritDefault: boolean;
  isActive: boolean;
};

export function parseStatusScopeInput(formData: FormData): ParsedStatusScopeInput {
  return {
    code: normalizeStatusCode(formData.get("code")),
    name: normalizeStatusText(formData.get("name")),
    sortOrder: normalizeSortOrder(formData.get("sortOrder")),
    inheritDefault: formData.get("inheritDefault") === "true",
    isActive: formData.get("isActive") === "true",
  };
}

export async function validateStatusScopeInput(
  input: ParsedStatusScopeInput,
  existingId?: string
) {
  if (!input.code || !input.name) {
    return actionError("Status scope not saved: code and name are required.");
  }

  const duplicate = await prisma.statusScope.findFirst({
    where: {
      code: input.code,
      ...(existingId ? { NOT: { id: existingId } } : {}),
    },
  });

  if (duplicate) {
    return actionError("Status scope not saved: code already exists.");
  }

  return null;
}
