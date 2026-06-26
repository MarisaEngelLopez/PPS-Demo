import { prisma } from "@/lib/prisma";
import { normalizePhaseSortOrder, normalizePhaseText } from "./phaseRules";
import type { PhaseActionResult } from "./phaseTypes";

export type ParsedPhaseInput = {
  name: string;
  description: string | null;
  sortOrder: number;
};

export function phaseOk(message: string): PhaseActionResult {
  return { ok: true, message };
}

export function phaseError(message: string): PhaseActionResult {
  return { ok: false, message };
}

export function parsePhaseInput(formData: FormData): ParsedPhaseInput {
  const description = normalizePhaseText(formData.get("description"));

  return {
    name: normalizePhaseText(formData.get("name")),
    description: description || null,
    sortOrder: normalizePhaseSortOrder(formData.get("sortOrder")),
  };
}

export async function validatePhaseInput(input: ParsedPhaseInput, existingId?: string) {
  if (!input.name) {
    return phaseError("Phase not saved: name is required.");
  }

  const duplicate = await prisma.phase.findFirst({
    where: {
      name: input.name,
      ...(existingId ? { NOT: { id: existingId } } : {}),
    },
  });

  if (duplicate) {
    return phaseError("Phase not saved: name already exists.");
  }

  return null;
}
