import { prisma } from "@/lib/prisma";
import {
  normalizeEvidenceTypeCode,
  normalizeEvidenceTypeSortOrder,
  normalizeEvidenceTypeText,
} from "./evidenceTypeRules";
import type { EvidenceTypeActionResult } from "./evidenceTypeTypes";

export type ParsedEvidenceTypeInput = {
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
};

export function evidenceTypeOk(message: string): EvidenceTypeActionResult {
  return { ok: true, message };
}

export function evidenceTypeError(message: string): EvidenceTypeActionResult {
  return { ok: false, message };
}

export function parseEvidenceTypeInput(
  formData: FormData
): ParsedEvidenceTypeInput {
  const description = normalizeEvidenceTypeText(formData.get("description"));

  return {
    code: normalizeEvidenceTypeCode(formData.get("code")),
    name: normalizeEvidenceTypeText(formData.get("name")),
    description: description || null,
    sortOrder: normalizeEvidenceTypeSortOrder(formData.get("sortOrder")),
  };
}

export async function validateEvidenceTypeInput(
  input: ParsedEvidenceTypeInput,
  existingId?: string
) {
  if (!input.code || !input.name) {
    return evidenceTypeError(
      "Evidence type not saved: code and name are required."
    );
  }

  const duplicate = await prisma.evidenceType.findFirst({
    where: {
      code: input.code,
      ...(existingId ? { NOT: { id: existingId } } : {}),
    },
  });

  if (duplicate) {
    return evidenceTypeError("Evidence type not saved: code already exists.");
  }

  return null;
}
