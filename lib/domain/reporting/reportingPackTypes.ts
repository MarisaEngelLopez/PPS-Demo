export type ReportingPackStatus = "DRAFT" | "READY" | "APPROVED" | "ARCHIVED";

export type ReportingPackCopySource = {
  reportIndex?: string | null;
  executiveSummary?: string | null;
  achievements?: string | null;
  issues?: string | null;
  nextSteps?: string | null;
  managementAsk?: string | null;
  conclusion?: string | null;
  reportingPeriod?: string | null;
};

export type ReportingPackVersionSource = {
  version: number;
};
