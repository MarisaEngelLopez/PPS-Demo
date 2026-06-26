export type ProjectExecutionActionResult = {
  ok: boolean;
  message: string;
};

export type ProjectVisibility = "BOTH" | "EXECUTIVE" | "DETAILED" | "HIDDEN";

export type ParsedProjectWorkstreamInput = {
  workstreamId: string;
  customName: string | null;
  reportingName: string | null;
  objective: string | null;
  deliverable: string | null;
  visibility: ProjectVisibility;
  plannedStartDate: Date | null;
  plannedEndDate: Date | null;
  actualStartDate: Date | null;
  actualEndDate: Date | null;
  plannedQuantity: number | null;
  actualQuantity: number | null;
  measureUnit: string | null;
  quantityType: string | null;
};

export type ParsedProjectTaskInput = {
  projectWorkstreamId: string;
  parentTaskId: string;
  name: string;
  sortOrder: number | null;
  description: string | null;
  reportingName: string | null;
  visibility: ProjectVisibility;
  plannedStartDate: Date | null;
  plannedEndDate: Date | null;
  actualStartDate: Date | null;
  actualEndDate: Date | null;
};

export type ParsedProjectEventInput = {
  projectId: string;
  eventTypeId: string;
  customName: string | null;
  reportingName: string | null;
  description: string | null;
  visibility: ProjectVisibility;
  linkedProjectWorkstreamId: string | null;
  eventDate: Date | null;
  completionDate: Date | null;
  plannedQuantity: number | null;
  actualQuantity: number | null;
  measureUnit: string | null;
  quantityType: string | null;
  isCompleted: boolean;
};
