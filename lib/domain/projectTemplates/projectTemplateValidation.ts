import { prisma } from "@/lib/prisma";
import {
  normalizeProjectTemplateCode,
  normalizeProjectTemplateText,
  normalizeTemplateNumber,
} from "./projectTemplateRules";
import type {
  ProjectTemplateActionResult,
  TemplateWorkstreamActionResult,
} from "./projectTemplateTypes";

export type ParsedProjectTemplateInput = {
  code: string;
  name: string;
};

export type ParsedTemplateWorkstreamInput = {
  templateId: string;
  workstreamId: string;
  sortOrder: number;
  plannedOffsetDays: number | null;
  durationDays: number | null;
};

export type ParsedTemplateWorkstreamUpdateInput = {
  id: string;
  templateId: string;
  sortOrder: number;
  plannedOffsetDays: number | null;
  durationDays: number | null;
};

export function projectTemplateOk(message: string): ProjectTemplateActionResult {
  return { ok: true, message };
}

export function projectTemplateError(message: string): ProjectTemplateActionResult {
  return { ok: false, message };
}

export function templateWorkstreamOk(message: string): TemplateWorkstreamActionResult {
  return { ok: true, message };
}

export function templateWorkstreamError(message: string): TemplateWorkstreamActionResult {
  return { ok: false, message };
}

export function parseProjectTemplateInput(formData: FormData): ParsedProjectTemplateInput {
  return {
    code: normalizeProjectTemplateCode(formData.get("code")),
    name: normalizeProjectTemplateText(formData.get("name")),
  };
}

export async function validateProjectTemplateInput(
  input: ParsedProjectTemplateInput,
  existingId?: string
) {
  if (!input.code || !input.name) {
    return projectTemplateError("Project template not saved: code and name are required.");
  }

  const duplicate = await prisma.projectTemplate.findFirst({
    where: {
      code: input.code,
      ...(existingId ? { NOT: { id: existingId } } : {}),
    },
  });

  if (duplicate) {
    return projectTemplateError("Project template not saved: code already exists.");
  }

  return null;
}

export function parseTemplateWorkstreamInput(
  formData: FormData
): ParsedTemplateWorkstreamInput {
  return {
    templateId: normalizeProjectTemplateText(formData.get("templateId")),
    workstreamId: normalizeProjectTemplateText(formData.get("workstreamId")),
    sortOrder: normalizeTemplateNumber(formData.get("sortOrder"), 100) ?? 100,
    plannedOffsetDays: normalizeTemplateNumber(
      formData.get("plannedOffsetDays"),
      null
    ),
    durationDays: normalizeTemplateNumber(formData.get("durationDays"), null),
  };
}

export function parseTemplateWorkstreamUpdateInput(
  formData: FormData
): ParsedTemplateWorkstreamUpdateInput {
  return {
    id: normalizeProjectTemplateText(formData.get("id")),
    templateId: normalizeProjectTemplateText(formData.get("templateId")),
    sortOrder: normalizeTemplateNumber(formData.get("sortOrder"), 100) ?? 100,
    plannedOffsetDays: normalizeTemplateNumber(
      formData.get("plannedOffsetDays"),
      null
    ),
    durationDays: normalizeTemplateNumber(formData.get("durationDays"), null),
  };
}

export async function validateTemplateWorkstreamInput(
  input: ParsedTemplateWorkstreamInput
) {
  if (!input.templateId || !input.workstreamId) {
    return templateWorkstreamError(
      "Template workstream not saved: template and workstream are required."
    );
  }

  const [template, workstream, duplicate] = await Promise.all([
    prisma.projectTemplate.findUnique({ where: { id: input.templateId } }),
    prisma.workstream.findUnique({ where: { id: input.workstreamId } }),
    prisma.templateWorkstream.findFirst({
      where: {
        templateId: input.templateId,
        workstreamId: input.workstreamId,
      },
    }),
  ]);

  if (!template) {
    return templateWorkstreamError("Template workstream not saved: template no longer exists.");
  }

  if (!workstream || !workstream.isActive) {
    return templateWorkstreamError("Template workstream not saved: selected workstream is inactive or missing.");
  }

  if (duplicate) {
    return templateWorkstreamError("Template workstream not saved: already exists in this template.");
  }

  return null;
}
