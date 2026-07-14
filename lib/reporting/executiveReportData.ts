import {
  getExecutiveReportProject,
  getExecutiveReportProjectOptions,
  getSelectedExecutiveProjectId,
  getSelectedReportingPack,
} from "@/lib/domain/reporting/executiveReportQueries";
import {
  formatReportDate,
  getWorkstreamStatus,
} from "@/lib/domain/reporting/executiveReportRules";
import { buildExecutiveReportViewModel } from "@/lib/domain/reporting/executiveReportViewModel";
import { getManagedNarrativeAssetText } from "@/lib/domain/narrative/narrativeRepository";
import { translate } from "@/lib/i18n/dictionaries";
import type { AppLocale } from "@/lib/i18n/locales";
import {
  getExecutiveReportSectionTitle,
  translateImpact,
  translateRiskCategory,
  translateStatus,
} from "@/lib/reporting/executiveReportTranslations";
import { translateConfiguredOption } from "@/lib/i18n/displayTranslations";

function formatDate(value?: Date | string | null) {
  const formatted = formatReportDate(value);
  return formatted === "-" ? null : formatted;
}

function translateWorkstreamState(
  state: string,
  t: (key: Parameters<typeof translate>[1]) => string
) {
  switch (state) {
    case "Completed":
      return t("metrics.completed");
    case "In Progress":
      return t("metrics.inProgress");
    case "Not Started":
      return t("timeline.variance.notStarted");
    default:
      return state;
  }
}

export async function getExecutiveReportData({
  locale,
  projectId,
  reportingPackId,
}: {
  locale: AppLocale;
  projectId?: string;
  reportingPackId?: string;
}) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const projects = await getExecutiveReportProjectOptions();

  const selectedProjectId = getSelectedExecutiveProjectId({
    projectId,
    projects,
  });

  const project = selectedProjectId
    ? await getExecutiveReportProject(selectedProjectId)
    : null;

  if (!project) {
    return {
      generatedAt: new Date().toISOString(),
      projects,
      selectedProjectId,
      project: null,
      reportingPack: null,
      metrics: null,
      sections: [],
    };
  }

  const reportingPack = getSelectedReportingPack({
    project,
    reportingPackId,
    selectedProjectId,
  });
  const reportModel = buildExecutiveReportViewModel({
    project,
    reportingPack,
    narrativeLanguage: locale === "es" ? "ES" : "EN",
  });

  const workstreams = reportModel.projectWorkstreams.map((item) => ({
    id: item.id,
    phase: item.workstream.phase.name,
    name: item.reportingName || item.customName || item.workstream.name,
    state: translateWorkstreamState(getWorkstreamStatus(item), t),
    plannedStartDate: formatDate(item.plannedStartDate),
    plannedEndDate: formatDate(item.plannedEndDate),
    actualStartDate: formatDate(item.actualStartDate),
    actualEndDate: formatDate(item.actualEndDate),
  }));

  const events = reportModel.projectEvents.map((event) => ({
    id: event.id,
    name: event.reportingName || event.customName || event.name,
    type: event.eventType?.name ?? null,
    date: formatDate(event.eventDate),
    completed: event.isCompleted,
    completionDate: formatDate(event.completionDate),
    workstream:
      event.linkedProjectWorkstream?.workstream.name ??
      event.linkedProjectWorkstream?.customName ??
      null,
  }));

  const decisions = project.projectDecisions.map((decision) => ({
    id: decision.id,
    code: decision.decisionCode,
    title: decision.title,
    recommendation: decision.recommendation,
    decision: decision.decision,
    owner: decision.owner,
    status: translateStatus(decision.statusRef, locale, t),
    impact: translateImpact(decision.impact, t),
    escalated: decision.escalated,
    dueDate: formatDate(decision.dueDate),
    decisionDate: formatDate(decision.decisionDate),
    workstream: decision.projectWorkstream?.workstream.name ?? null,
  }));

  const metrics = {
    workstreams: {
      total: workstreams.length,
      ...reportModel.healthCounts,
    },
    milestones: {
      total: events.length,
      completed: reportModel.milestoneGroups.completedMilestones.length,
      open: reportModel.milestoneGroups.openMilestones.length,
      overdue: reportModel.milestoneGroups.overdueMilestones.length,
    },
    risks: {
      total: project.projectRisks.length,
      active: reportModel.riskGroups.activeRisks.length,
      closed: reportModel.riskGroups.closedRisks.length,
      red: reportModel.riskGroups.redRisks.length,
      escalated: reportModel.riskGroups.escalatedRisks.length,
    },
    decisions: {
      total: decisions.length,
      escalated: decisions.filter((decision) => decision.escalated).length,
      critical: decisions.filter((decision) => decision.impact === "CRITICAL").length,
    },
  };
  const detailedNarrative = (
    objectKey:
      | "executive-summary"
      | "accomplishments"
      | "issues-concerns"
      | "next-steps"
      | "management-ask"
      | "conclusion"
  ) =>
    getManagedNarrativeAssetText(reportModel.narrativeAssets, {
      objectKey,
      variant: "DETAILED",
    });

  const sections = [
    {
      id: "executive-summary",
      title: getExecutiveReportSectionTitle({ id: "executive-summary", title: "" }, t),
      type: "narrative",
      content: detailedNarrative("executive-summary"),
    },
    {
      id: "achievements",
      title: getExecutiveReportSectionTitle({ id: "achievements", title: "" }, t),
      type: "narrative",
      content: detailedNarrative("accomplishments"),
    },
    {
      id: "issues",
      title: getExecutiveReportSectionTitle({ id: "issues", title: "" }, t),
      type: "narrative",
      content: detailedNarrative("issues-concerns"),
    },
    {
      id: "decision-attention",
      title: getExecutiveReportSectionTitle({ id: "decision-attention", title: "" }, t),
      type: "table",
      rows: reportModel.executiveDecisionAttention.slice(0, 8).map((decision) => ({
        id: decision.id,
        code: decision.decisionCode,
        title: decision.title,
        recommendation: decision.recommendation,
        decision: decision.decision,
        owner: decision.owner,
        status: translateStatus(decision.statusRef, locale, t),
        impact: translateImpact(decision.impact, t),
        escalated: decision.escalated,
        dueDate: formatDate(decision.dueDate),
        decisionDate: formatDate(decision.decisionDate),
        workstream: decision.projectWorkstream?.workstream.name ?? null,
      })),
    },
    {
      id: "risk-attention",
      title: getExecutiveReportSectionTitle({ id: "risk-attention", title: "" }, t),
      type: "table",
      rows: reportModel.attentionRisks.slice(0, 8).map((risk) => ({
        code: risk.riskCode,
        title: risk.title,
        category: translateRiskCategory(risk.category, locale, t),
        exposure: risk.exposure,
        status: translateStatus(risk.status, locale, t),
        owner: risk.owner?.fullName ?? null,
        targetResolutionDate: formatDate(risk.targetResolutionDate),
      })),
    },
    {
      id: "workstream-status",
      title: t("report.workstreamCockpit"),
      type: "table",
      rows: workstreams,
    },
    {
      id: "milestones",
      title: t("sections.milestones"),
      type: "table",
      rows: events,
    },
    {
      id: "next-steps",
      title: getExecutiveReportSectionTitle({ id: "next-steps", title: "" }, t),
      type: "narrative",
      content: detailedNarrative("next-steps"),
    },
    {
      id: "management-ask",
      title: getExecutiveReportSectionTitle({ id: "management-ask", title: "" }, t),
      type: "narrative",
      content: detailedNarrative("management-ask"),
    },
    {
      id: "conclusion",
      title: getExecutiveReportSectionTitle({ id: "conclusion", title: "" }, t),
      type: "narrative",
      content: detailedNarrative("conclusion"),
    },
  ].filter((section) => {
    if (section.type === "narrative") return Boolean(section.content);
    return Boolean(section.rows?.length);
  });

  return {
    generatedAt: new Date().toISOString(),
    projects,
    selectedProjectId,
    project: {
      id: project.id,
      code: project.projectCode,
      name: project.name,
      type: translateConfiguredOption(project.projectType, locale, t, "projectType") || null,
      status: translateStatus(project.governedStatus, locale, t),
      healthStatus: project.healthStatus,
      manager: project.projectManagerContact?.name ?? null,
      sponsor: project.sponsorContact?.name ?? null,
      client: project.clientOrganization?.displayName ?? project.clientOrganization?.name ?? null,
      issuer:
        project.issuerOrganization?.displayName ?? project.issuerOrganization?.name ?? null,
      delivery:
        project.deliveryOrganization?.displayName ??
        project.deliveryOrganization?.name ??
        null,
      startDate: formatDate(project.startDate),
      plannedStartDate: formatDate(project.plannedStartDate),
      plannedEndDate: formatDate(project.plannedEndDate),
      actualStartDate: formatDate(project.actualStartDate),
      actualEndDate: formatDate(project.actualEndDate),
    },
    reportingPack,
    metrics,
    sections,
    workstreams,
    events,
    risks: project.projectRisks,
    decisions,
  };
}
