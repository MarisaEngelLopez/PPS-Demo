import type {
  ReportingPackCopySource,
  ReportingPackStatus,
  ReportingPackVersionSource,
} from "@/lib/domain/reporting/reportingPackTypes";

export const REPORTING_PACK_STATUSES: ReportingPackStatus[] = [
  "DRAFT",
  "READY",
  "APPROVED",
  "ARCHIVED",
];

export const EDITABLE_REPORTING_PACK_STATUSES: ReportingPackStatus[] = [
  "DRAFT",
  "READY",
];

export const LOCKED_REPORTING_PACK_STATUSES: ReportingPackStatus[] = [
  "APPROVED",
  "ARCHIVED",
];

export const NEXT_DRAFT_SOURCE_STATUSES: ReportingPackStatus[] = [
  "READY",
  "APPROVED",
];

export const DEFAULT_REPORT_INDEX =
  "1. Executive Summary\n2. Achievements\n3. Issues / Concerns\n4. Risks\n5. Milestones / Timeline\n6. Next Steps\n7. Management Ask\n8. Conclusion";

export function isReportingPackStatus(value: string): value is ReportingPackStatus {
  return REPORTING_PACK_STATUSES.includes(value as ReportingPackStatus);
}

export function normalizeReportingPackStatus(value: string | null) {
  return isReportingPackStatus(value || "") ? (value as ReportingPackStatus) : "DRAFT";
}

export function isReportingPackEditable(status: string | null) {
  return EDITABLE_REPORTING_PACK_STATUSES.includes(
    normalizeReportingPackStatus(status)
  );
}

export function isReportingPackLocked(status: string | null) {
  return LOCKED_REPORTING_PACK_STATUSES.includes(
    normalizeReportingPackStatus(status)
  );
}

export function canCopyToNextDraft(status: string | null) {
  return NEXT_DRAFT_SOURCE_STATUSES.includes(normalizeReportingPackStatus(status));
}

export function canDeleteReportingPack(status: string | null) {
  return normalizeReportingPackStatus(status) === "DRAFT";
}

export function getNextReportingPackVersion(
  latestPack?: ReportingPackVersionSource | null
) {
  return latestPack ? latestPack.version + 1 : 1;
}

export function getNextDraftTitle(version: number) {
  return `Executive Reporting Pack v${version}`;
}

export function getReportingPackCopyData(source: ReportingPackCopySource) {
  return {
    reportingPeriod: source.reportingPeriod ?? null,
    reportIndex: source.reportIndex ?? null,
    executiveSummary: source.executiveSummary ?? null,
    achievements: source.achievements ?? null,
    issues: source.issues ?? null,
    nextSteps: source.nextSteps ?? null,
    managementAsk: source.managementAsk ?? null,
    conclusion: source.conclusion ?? null,
  };
}
