import type { ReportingPackStatus } from "@/lib/domain/reporting/reportingPackTypes";

export type ActionResult = {
  ok: boolean;
  message: string;
};

export type ReportingPackAction = (
  formData: FormData
) => Promise<ActionResult | undefined>;

export type ReportingPackCommand = (formData: FormData) => Promise<void>;

export type ReportingPackSummary = {
  id: string;
  projectId: string;
  title: string;
  reportingDate: Date | string;
  reportingPeriod?: string | null;
  version: number;
  status: ReportingPackStatus | string;
  reportIndex?: string | null;
  executiveSummary?: string | null;
  achievements?: string | null;
  issues?: string | null;
  nextSteps?: string | null;
  managementAsk?: string | null;
  conclusion?: string | null;
  isActive: boolean;
};

export type ReportingWorkspaceProject = {
  id: string;
};

export function toDateInputValue(value: Date | string | null | undefined) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}
