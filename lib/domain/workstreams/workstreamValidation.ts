import { prisma } from "@/lib/prisma";
import {
  normalizeWorkstreamSortOrder,
  normalizeWorkstreamText,
} from "./workstreamRules";
import type { WorkstreamActionResult } from "./workstreamTypes";

export type ParsedWorkstreamInput = {
  name: string;
  description: string | null;
  phaseId: string;
  sortOrder: number;
};

export function workstreamOk(message: string): WorkstreamActionResult {
  return { ok: true, message };
}

export function workstreamError(message: string): WorkstreamActionResult {
  return { ok: false, message };
}

export function parseWorkstreamInput(formData: FormData): ParsedWorkstreamInput {
  const description = normalizeWorkstreamText(formData.get("description"));

  return {
    name: normalizeWorkstreamText(formData.get("name")),
    description: description || null,
    phaseId: normalizeWorkstreamText(formData.get("phaseId")),
    sortOrder: normalizeWorkstreamSortOrder(formData.get("sortOrder")),
  };
}

export async function validateWorkstreamInput(
  input: ParsedWorkstreamInput,
  existingId?: string
) {
  if (!input.name || !input.phaseId) {
    return workstreamError("Workstream not saved: name and phase are required.");
  }

  const phase = await prisma.phase.findUnique({
    where: { id: input.phaseId },
  });

  if (!phase) {
    return workstreamError("Workstream not saved: selected phase no longer exists.");
  }

  const duplicate = await prisma.workstream.findFirst({
    where: {
      name: input.name,
      phaseId: input.phaseId,
      ...(existingId ? { NOT: { id: existingId } } : {}),
    },
  });

  if (duplicate) {
    return workstreamError("Workstream not saved: name already exists in this phase.");
  }

  return null;
}
