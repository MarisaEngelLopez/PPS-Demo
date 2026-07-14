import { findManagedNarrativeAsset } from "@/lib/domain/narrative/narrativeRepository";
import type { ManagedNarrativeObjectKey } from "@/lib/domain/narrative/narrativeTypes";
import type { AppLocale } from "@/lib/i18n/locales";
import type {
  ExecutiveReportProject,
  ExecutiveReportReportingPack,
} from "@/lib/domain/reporting/executiveReportTypes";
import type { buildExecutiveReportViewModel } from "@/lib/domain/reporting/executiveReportViewModel";

export const EXECUTIVE_BRIEFING_LAYOUT = {
  columns: 4,
  rows: [4, 4, 2] as const,
  timelineMode: "PHASES" as const,
};

export type ExecutiveBriefingNarrativeKey =
  | "executive-summary"
  | "progress-since-last-report"
  | "issues-concerns"
  | "next-steps"
  | "management-ask"
  | "conclusion";

type ReportViewModel = ReturnType<typeof buildExecutiveReportViewModel>;

function getShortNarrative(
  assets: ReportViewModel["narrativeAssets"],
  objectKey: ExecutiveBriefingNarrativeKey
) {
  const keys: ManagedNarrativeObjectKey[] =
    objectKey === "progress-since-last-report"
      ? ["progress-since-last-report", "accomplishments"]
      : [objectKey];

  for (const key of keys) {
    const asset = findManagedNarrativeAsset(assets, {
      objectKey: key,
      variant: "SHORT",
    });
    if (asset?.content) return asset.content;
  }

  return null;
}

export function buildExecutiveBriefingModel({
  project,
  reportingPack,
  report,
  locale,
}: {
  project: ExecutiveReportProject;
  reportingPack: ExecutiveReportReportingPack | null;
  report: ReportViewModel;
  locale: AppLocale;
}) {
  const previousReportingPack = project.reportingPacks.find(
    (item) => item.id !== reportingPack?.id
  );
  const pulseBoundary = previousReportingPack?.reportingDate
    ? new Date(previousReportingPack.reportingDate)
    : new Date(report.reportDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  const text = (en: string, es: string) => (locale === "es" ? es : en);

  const narratives = {
    executiveSummary: getShortNarrative(report.narrativeAssets, "executive-summary"),
    progressSinceLastReport: getShortNarrative(
      report.narrativeAssets,
      "progress-since-last-report"
    ),
    issuesConcerns: getShortNarrative(report.narrativeAssets, "issues-concerns"),
    nextSteps: getShortNarrative(report.narrativeAssets, "next-steps"),
    managementAsk: getShortNarrative(report.narrativeAssets, "management-ask"),
    conclusion: getShortNarrative(report.narrativeAssets, "conclusion"),
  };

  const missingNarratives = Object.entries(narratives)
    .filter(([, content]) => !content)
    .map(([key]) => key);

  return {
    layout: EXECUTIVE_BRIEFING_LAYOUT,
    narratives,
    missingNarratives,
    isReady: missingNarratives.length === 0,
    currentPhase:
      report.projectWorkstreams
        .filter((item) => item.actualStartDate && !item.actualEndDate)
        .at(-1)?.workstream.phase.name ??
      report.projectWorkstreams.find((item) => !item.actualEndDate)?.workstream.phase
        .name ??
      report.projectWorkstreams.at(-1)?.workstream.phase.name ??
      "-",
    timelineEvents: report.projectEvents.filter(
      (event) =>
        !event.linkedProjectWorkstreamId &&
        event.visibility !== "HIDDEN" &&
        event.visibility !== "DETAILED"
    ),
    phases: [
      ...new Set(
        report.projectWorkstreams.map((item) => item.workstream.phase.name)
      ),
    ],
    primaryRisk: report.attentionRisks[0] ?? null,
    primaryDecision: report.executiveDecisionAttention[0] ?? null,
    pulse: [
      {
        key: "completedWorkstreams",
        label: text("Completed workstreams", "Líneas terminadas"),
        value: report.projectWorkstreams.filter(
          (item) =>
            item.actualEndDate && new Date(item.actualEndDate) > pulseBoundary
        ).length,
      },
      {
        key: "completedMilestones",
        label: text("Completed milestones", "Hitos terminados"),
        value: report.projectEvents.filter(
          (item) =>
            item.isCompleted &&
            new Date(item.completionDate ?? item.eventDate) > pulseBoundary
        ).length,
      },
      {
        key: "closedRisks",
        label: text("Closed risks", "Riesgos cerrados"),
        value: report.riskGroups.closedRisks.filter(
          (item) => new Date(item.updatedAt) > pulseBoundary
        ).length,
      },
      {
        key: "newEscalations",
        label: text("New escalations", "Nuevos escalados"),
        value:
          report.attentionRisks.filter(
            (item) => item.escalated && new Date(item.updatedAt) > pulseBoundary
          ).length +
          report.executiveDecisionAttention.filter(
            (item) => item.escalated && new Date(item.updatedAt) > pulseBoundary
          ).length,
      },
    ],
  };
}
