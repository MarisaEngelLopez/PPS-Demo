import {
  getMilestoneGroups,
  getRiskGroups,
  getWorkstreamHealthCounts,
} from "@/lib/domain/reporting/executiveReportMetrics";
import {
  buildDecisionCockpitMetrics,
  buildMilestoneCockpitMetrics,
  buildRiskCockpitMetrics,
  buildWorkstreamCockpitMetrics,
} from "@/lib/domain/reporting/cockpitMetrics";
import {
  isActiveEvent,
  isActiveWorkstream,
  requiresExecutiveDecisionAttention,
  requiresExecutiveRiskAttention,
} from "@/lib/domain/reporting/executiveReportRules";
import { getExecutiveReportSections } from "@/lib/domain/reporting/executiveReportSections";
import {
  buildManagedNarrativeAssetsFromReportingPack,
  buildManagedNarrativeAssetsFromRepository,
} from "@/lib/domain/narrative/narrativeRepository";
import { buildExecutiveRiskLifecycleRows } from "./executiveRiskLifecycle";
import type {
  ExecutiveReportDecision,
  ExecutiveReportProject,
  ExecutiveReportReportingPack,
} from "@/lib/domain/reporting/executiveReportTypes";
import type { NarrativeLanguage } from "@/lib/domain/narrative/narrativeTypes";

function getDecisionStatus(decision: ExecutiveReportDecision) {
  return (
    decision.statusRef?.code?.toUpperCase() ??
    decision.statusRef?.name?.toUpperCase() ??
    ""
  );
}

function isRecentDecisionOutcome(
  decision: ExecutiveReportDecision,
  today: Date
) {
  if (!["APPROVED", "REJECTED", "CLOSED", "CLOSE"].includes(getDecisionStatus(decision))) {
    return false;
  }

  const referenceDate = decision.decisionDate ?? decision.updatedAt;
  const outcomeDate = new Date(referenceDate);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return outcomeDate >= thirtyDaysAgo;
}

export function buildExecutiveReportViewModel({
  project,
  reportingPack,
  pdfMode = false,
  today = new Date(),
  narrativeLanguage,
  includeDraftNarratives = false,
}: {
  project: ExecutiveReportProject;
  reportingPack: ExecutiveReportReportingPack | null;
  pdfMode?: boolean;
  today?: Date;
  narrativeLanguage?: NarrativeLanguage;
  includeDraftNarratives?: boolean;
}) {
  const reportDate = new Date(today);
  reportDate.setHours(0, 0, 0, 0);

  const decisions = project.projectDecisions ?? [];
  const executiveDecisionAttention = decisions.filter(
    requiresExecutiveDecisionAttention
  );
  const recentDecisionOutcomes = decisions.filter((decision) =>
    isRecentDecisionOutcome(decision, reportDate)
  );

  const riskGroups = getRiskGroups(project, reportDate);
  const riskLifecycleRows = buildExecutiveRiskLifecycleRows(
    project.projectRisks ?? []
  );
  const managementReviewRisks = riskLifecycleRows.filter(
    (row) => row.lifecycle.needsManagementReview
  );
  const attentionRisks = riskGroups.activeRisks
    .filter((risk) => requiresExecutiveRiskAttention(risk, reportDate))
    .sort((a, b) => {
      const exposureA = a.exposure ?? a.probability * a.impact;
      const exposureB = b.exposure ?? b.probability * b.impact;
      return exposureB - exposureA;
    });

  const projectWorkstreams = (project.projectWorkstreams ?? []).filter(
    isActiveWorkstream
  );
  const activeWorkstreamIds = new Set(
    projectWorkstreams.map((workstream) => workstream.id)
  );
  const projectEvents = (project.events ?? []).filter(
    (event) =>
      isActiveEvent(event) &&
      (!event.linkedProjectWorkstreamId ||
        activeWorkstreamIds.has(event.linkedProjectWorkstreamId))
  );
  const healthCounts = getWorkstreamHealthCounts(projectWorkstreams);
  const milestoneGroups = getMilestoneGroups(projectEvents);
  const decisionCockpitMetrics = buildDecisionCockpitMetrics({
    decisions,
    today: reportDate,
  });
  const riskCockpitMetrics = buildRiskCockpitMetrics({
    risks: project.projectRisks ?? [],
    ...riskGroups,
  });
  const workstreamCockpitMetrics =
    buildWorkstreamCockpitMetrics(projectWorkstreams);
  const milestoneCockpitMetrics = buildMilestoneCockpitMetrics(projectEvents);
  const selectedNarrativeLanguage =
    narrativeLanguage ??
    (project.reportLanguageMode === "ES" ? "ES" : project.defaultLanguage);
  const repositoryNarrativeAssets = buildManagedNarrativeAssetsFromRepository({
    narratives: project.managedNarratives ?? [],
    sourceReportingPackId: reportingPack?.id,
    language: selectedNarrativeLanguage,
    includeDrafts: includeDraftNarratives,
  });
  const reportingPackLanguage: NarrativeLanguage =
    project.reportLanguageMode === "ES"
      ? "ES"
      : project.reportLanguageMode === "EN"
        ? "EN"
        : project.defaultLanguage;
  const reportingPackNarrativeAssets =
    selectedNarrativeLanguage === reportingPackLanguage
      ? buildManagedNarrativeAssetsFromReportingPack({
          reportingPack,
          language: reportingPackLanguage,
        })
      : [];
  const repositoryKeys = new Set(
    repositoryNarrativeAssets.map((asset) => `${asset.objectKey}:${asset.variant}`)
  );
  const narrativeAssets = [
    ...repositoryNarrativeAssets,
    ...reportingPackNarrativeAssets.filter(
      (asset) => !repositoryKeys.has(`${asset.objectKey}:${asset.variant}`)
    ),
  ];

  const sections = getExecutiveReportSections({
    reportingPack,
    decisions,
    executiveDecisionAttention,
    activeRisksLength: riskGroups.activeRisks.length,
    riskLifecycleRowsLength: riskLifecycleRows.length,
    managementReviewRisksLength: managementReviewRisks.length,
    projectEvents,
    projectWorkstreams,
    pdfMode,
  });

  return {
    project,
    reportingPack,
    reportDate,
    decisions,
    executiveDecisionAttention,
    recentDecisionOutcomes,
    riskGroups,
    riskLifecycleRows,
    managementReviewRisks,
    attentionRisks,
    projectWorkstreams,
    projectEvents,
    healthCounts,
    milestoneGroups,
    decisionCockpitMetrics,
    riskCockpitMetrics,
    workstreamCockpitMetrics,
    milestoneCockpitMetrics,
    narrativeAssets,
    sections,
  };
}
