import { prisma } from "@/lib/prisma";
import {
  boolInput,
  normalizeRiskReviewConfigCode,
  normalizeRiskReviewConfigSortOrder,
  normalizeRiskReviewConfigText,
} from "./riskReviewConfigRules";
import type { RiskReviewConfigActionResult } from "./riskReviewConfigTypes";

export type ParsedRiskReviewTypeInput = {
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isInterim: boolean;
  isResidual: boolean;
  isClosure: boolean;
};

export type ParsedRiskReviewOutcomeInput = {
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isPending: boolean;
  isAccepted: boolean;
  isContinueMitigation: boolean;
  isEscalated: boolean;
  isClosed: boolean;
};

export function riskReviewConfigOk(
  message: string
): RiskReviewConfigActionResult {
  return { ok: true, message };
}

export function riskReviewConfigError(
  message: string
): RiskReviewConfigActionResult {
  return { ok: false, message };
}

export function parseRiskReviewTypeInput(
  formData: FormData
): ParsedRiskReviewTypeInput {
  const description = normalizeRiskReviewConfigText(
    formData.get("description")
  );

  return {
    code: normalizeRiskReviewConfigCode(formData.get("code")),
    name: normalizeRiskReviewConfigText(formData.get("name")),
    description: description || null,
    sortOrder: normalizeRiskReviewConfigSortOrder(formData.get("sortOrder")),
    isInterim: boolInput(formData.get("isInterim")),
    isResidual: boolInput(formData.get("isResidual")),
    isClosure: boolInput(formData.get("isClosure")),
  };
}

export function parseRiskReviewOutcomeInput(
  formData: FormData
): ParsedRiskReviewOutcomeInput {
  const description = normalizeRiskReviewConfigText(
    formData.get("description")
  );

  return {
    code: normalizeRiskReviewConfigCode(formData.get("code")),
    name: normalizeRiskReviewConfigText(formData.get("name")),
    description: description || null,
    sortOrder: normalizeRiskReviewConfigSortOrder(formData.get("sortOrder")),
    isPending: boolInput(formData.get("isPending")),
    isAccepted: boolInput(formData.get("isAccepted")),
    isContinueMitigation: boolInput(formData.get("isContinueMitigation")),
    isEscalated: boolInput(formData.get("isEscalated")),
    isClosed: boolInput(formData.get("isClosed")),
  };
}

export async function validateRiskReviewTypeInput(
  input: ParsedRiskReviewTypeInput,
  existingId?: string
) {
  if (!input.code || !input.name) {
    return riskReviewConfigError(
      "Review type not saved: code and name are required."
    );
  }

  const duplicate = await prisma.riskReviewType.findFirst({
    where: {
      code: input.code,
      ...(existingId ? { NOT: { id: existingId } } : {}),
    },
  });

  if (duplicate) {
    return riskReviewConfigError("Review type not saved: code already exists.");
  }

  return null;
}

export async function validateRiskReviewOutcomeInput(
  input: ParsedRiskReviewOutcomeInput,
  existingId?: string
) {
  if (!input.code || !input.name) {
    return riskReviewConfigError(
      "Review outcome not saved: code and name are required."
    );
  }

  const duplicate = await prisma.riskReviewOutcome.findFirst({
    where: {
      code: input.code,
      ...(existingId ? { NOT: { id: existingId } } : {}),
    },
  });

  if (duplicate) {
    return riskReviewConfigError(
      "Review outcome not saved: code already exists."
    );
  }

  return null;
}
