import {
  hasInvalidProjectDateRange,
  normalizeProjectCadence,
  normalizeProjectHealth,
  normalizeProjectText,
  projectDateOrNull,
  projectError,
  projectTextOrNull,
} from "./projectRules";
import type {
  ParsedProjectCreateInput,
  ParsedProjectHeaderInput,
  ProjectActionResult,
} from "./projectTypes";

export function parseProjectHeaderInput(
  formData: FormData
): ParsedProjectHeaderInput {
  return {
    id: normalizeProjectText(formData.get("id")),
    name: normalizeProjectText(formData.get("name")),
    governedStatusId: normalizeProjectText(formData.get("governedStatusId")),
    projectManagerContactId: normalizeProjectText(
      formData.get("projectManagerContactId")
    ),
    healthStatus: normalizeProjectHealth(formData.get("healthStatus")),
    reportingCadence: normalizeProjectCadence(formData.get("reportingCadence")),
    startDate: projectDateOrNull(formData.get("startDate")),
    plannedStartDate: projectDateOrNull(formData.get("plannedStartDate")),
    plannedEndDate: projectDateOrNull(formData.get("plannedEndDate")),
    actualStartDate: projectDateOrNull(formData.get("actualStartDate")),
    actualEndDate: projectDateOrNull(formData.get("actualEndDate")),
    issuerOrganizationId: projectTextOrNull(formData.get("issuerOrganizationId")),
    clientOrganizationId: projectTextOrNull(formData.get("clientOrganizationId")),
    deliveryOrganizationId: projectTextOrNull(
      formData.get("deliveryOrganizationId")
    ),
    sponsorContactId: projectTextOrNull(formData.get("sponsorContactId")),
    showIssuerLogo: normalizeProjectText(formData.get("showIssuerLogo")) === "true",
    showClientLogo: normalizeProjectText(formData.get("showClientLogo")) === "true",
    showDeliveryLogo:
      normalizeProjectText(formData.get("showDeliveryLogo")) === "true",
  };
}

export function parseProjectCreateInput(
  formData: FormData
): ParsedProjectCreateInput {
  return {
    name: normalizeProjectText(formData.get("name")),
    projectTypeId: projectTextOrNull(formData.get("projectTypeId")),
    governedStatusId: normalizeProjectText(formData.get("governedStatusId")),
    projectManagerContactId: normalizeProjectText(
      formData.get("projectManagerContactId")
    ),
    templateId: normalizeProjectText(formData.get("templateId")),
    startDate: projectDateOrNull(formData.get("startDate")) ?? new Date(),
  };
}

export function validateProjectHeaderInput(
  input: ParsedProjectHeaderInput
): ProjectActionResult | null {
  if (!input.startDate) {
    return projectError("Project not updated: start date is required.");
  }

  if (
    !input.id ||
    !input.name ||
    !input.governedStatusId ||
    !input.projectManagerContactId
  ) {
    return projectError(
      "Project not updated: name, status and project manager are required."
    );
  }

  if (hasInvalidProjectDateRange(input.plannedStartDate, input.plannedEndDate)) {
    return projectError(
      "Project not updated: planned end cannot be before planned start."
    );
  }

  if (hasInvalidProjectDateRange(input.actualStartDate, input.actualEndDate)) {
    return projectError(
      "Project not updated: actual end cannot be before actual start."
    );
  }

  return null;
}

export function validateProjectCreateInput(
  input: ParsedProjectCreateInput
): ProjectActionResult | null {
  if (!input.name || !input.governedStatusId || !input.projectManagerContactId) {
    return projectError(
      "Project not added: name, status and project manager are required."
    );
  }

  return null;
}
