import {
  hasInvalidDateRange,
  normalizeProjectExecutionText,
  normalizeProjectVisibility,
  numberOrNull,
  parseDateOrNull,
  projectExecutionError,
  textOrNull,
} from "./projectExecutionRules";
import type {
  ParsedProjectEventInput,
  ParsedProjectTaskInput,
  ParsedProjectWorkstreamInput,
} from "./projectExecutionTypes";

export function parseProjectWorkstreamInput(
  formData: FormData
): ParsedProjectWorkstreamInput {
  return {
    workstreamId: normalizeProjectExecutionText(formData.get("workstreamId")),
    customName: textOrNull(formData.get("customName")),
    reportingName: textOrNull(formData.get("reportingName")),
    objective: textOrNull(formData.get("objective")),
    deliverable: textOrNull(formData.get("deliverable")),
    visibility: normalizeProjectVisibility(formData.get("visibility")),
    plannedStartDate: parseDateOrNull(formData.get("plannedStartDate")),
    plannedEndDate: parseDateOrNull(formData.get("plannedEndDate")),
    actualStartDate: parseDateOrNull(formData.get("actualStartDate")),
    actualEndDate: parseDateOrNull(formData.get("actualEndDate")),
    plannedQuantity: numberOrNull(formData.get("plannedQuantity")),
    actualQuantity: numberOrNull(formData.get("actualQuantity")),
    measureUnit: textOrNull(formData.get("measureUnit")),
    quantityType: textOrNull(formData.get("quantityType")),
  };
}

export function parseProjectTaskInput(formData: FormData): ParsedProjectTaskInput {
  return {
    projectWorkstreamId: normalizeProjectExecutionText(
      formData.get("projectWorkstreamId")
    ),
    parentTaskId: normalizeProjectExecutionText(formData.get("parentTaskId")),
    name: normalizeProjectExecutionText(formData.get("name")),
    sortOrder: numberOrNull(formData.get("sortOrder")),
    description: textOrNull(formData.get("description")),
    reportingName: textOrNull(formData.get("reportingName")),
    visibility: normalizeProjectVisibility(formData.get("visibility")),
    plannedStartDate: parseDateOrNull(formData.get("plannedStartDate")),
    plannedEndDate: parseDateOrNull(formData.get("plannedEndDate")),
    actualStartDate: parseDateOrNull(formData.get("actualStartDate")),
    actualEndDate: parseDateOrNull(formData.get("actualEndDate")),
  };
}

export function parseProjectEventInput(formData: FormData): ParsedProjectEventInput {
  return {
    projectId: normalizeProjectExecutionText(formData.get("projectId")),
    eventTypeId: normalizeProjectExecutionText(formData.get("eventTypeId")),
    customName: textOrNull(formData.get("customName")),
    reportingName: textOrNull(formData.get("reportingName")),
    description: textOrNull(formData.get("description")),
    visibility: normalizeProjectVisibility(formData.get("visibility")),
    linkedProjectWorkstreamId: textOrNull(
      formData.get("linkedProjectWorkstreamId")
    ),
    eventDate: parseDateOrNull(formData.get("eventDate")),
    completionDate: parseDateOrNull(formData.get("completionDate")),
    plannedQuantity: numberOrNull(formData.get("plannedQuantity")),
    actualQuantity: numberOrNull(formData.get("actualQuantity")),
    measureUnit: textOrNull(formData.get("measureUnit")),
    quantityType: textOrNull(formData.get("quantityType")),
    isCompleted: normalizeProjectExecutionText(formData.get("isCompleted")) === "true",
  };
}

export function validateProjectWorkstreamDates(
  input: Pick<
    ParsedProjectWorkstreamInput,
    "plannedStartDate" | "plannedEndDate" | "actualStartDate" | "actualEndDate"
  >,
  entityName = "Workstream"
) {
  if (hasInvalidDateRange(input.plannedStartDate, input.plannedEndDate)) {
    return projectExecutionError(
      `${entityName} not saved: planned end cannot be before planned start.`
    );
  }

  if (hasInvalidDateRange(input.actualStartDate, input.actualEndDate)) {
    return projectExecutionError(
      `${entityName} not saved: actual end cannot be before actual start.`
    );
  }

  return null;
}

export function validateProjectTaskDates(input: ParsedProjectTaskInput) {
  return validateProjectWorkstreamDates(input, "Task");
}
