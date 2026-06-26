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
import { buildExecutiveRiskLifecycleRows } from "./executiveRiskLifecycle";
import type {
  ExecutiveReportDecision,
  ExecutiveReportProject,
  ExecutiveReportReportingPack,
} from "@/lib/domain/reporting/executiveReportTypes";

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
}: {
  project: ExecutiveReportProject;
  reportingPack: ExecutiveReportReportingPack | null;
  pdfMode?: boolean;
  today?: Date;
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
    sections,
  };
}
