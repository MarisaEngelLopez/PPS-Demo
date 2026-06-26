import type {
  ExecutiveReportDecision,
  ExecutiveReportEvent,
  ExecutiveReportReportingPack,
  ExecutiveReportSection,
  ExecutiveReportWorkstream,
} from "@/lib/domain/reporting/executiveReportTypes";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

function section(
  id: string,
  title: string,
  titleKey: TranslationKey,
  visible: boolean
): ExecutiveReportSection {
  return { id, title, titleKey, visible };
}

export function getExecutiveReportSections({
  reportingPack,
  decisions,
  executiveDecisionAttention,
  activeRisksLength,
  riskLifecycleRowsLength,
  managementReviewRisksLength,
  projectEvents,
  projectWorkstreams,
  pdfMode = false,
}: {
  reportingPack: ExecutiveReportReportingPack | null;
  decisions: ExecutiveReportDecision[];
  executiveDecisionAttention: ExecutiveReportDecision[];
  activeRisksLength: number;
  riskLifecycleRowsLength: number;
  managementReviewRisksLength: number;
  projectEvents: ExecutiveReportEvent[];
  projectWorkstreams: ExecutiveReportWorkstream[];
  pdfMode?: boolean;
}): ExecutiveReportSection[] {
  const decisionTitle = pdfMode
    ? "Decision Cockpit & Attention"
    : "Decision Cockpit";
  const riskTitle = pdfMode ? "Risk Cockpit & Attention" : "Risk Cockpit";

  return [
    section("executive-summary", "Executive Summary", "report.executiveSummary", Boolean(reportingPack?.executiveSummary)),
    section("achievements", "Achievements", "report.achievements", Boolean(reportingPack?.achievements)),
    section("issues", "Issues / Concerns", "report.issuesConcerns", Boolean(reportingPack?.issues)),
    section(
      "decision-cockpit",
      decisionTitle,
      pdfMode ? "report.decisionCockpitAttention" : "report.decisionCockpit",
      decisions.length > 0
    ),
    section("decision-attention", "Decision Queue", "report.executiveDecisionAttention", !pdfMode && executiveDecisionAttention.length > 0),
    section("decision-outcomes", "Recent Decision Outcomes", "report.recentDecisionOutcomes", !pdfMode),
    section(
      "risk-cockpit",
      riskTitle,
      pdfMode ? "report.riskCockpitAttention" : "report.riskCockpit",
      true
    ),
    section("risk-attention", "Escalated Risks", "report.riskAttention", activeRisksLength > 0),
    section("risk-lifecycle-summary", "Risk Lifecycle Summary", "sections.riskLifecycleSummary", riskLifecycleRowsLength > 0),
    section("risk-management-review", "Risk Management Review Detail", "report.managementReviewDetail", managementReviewRisksLength > 0),
    section("workstreams", "Workstreams", "labels.workstreams", projectWorkstreams.length > 0),
    section("milestones", "Milestones", "sections.milestones", projectEvents.length > 0),
    section(
      "gantt-detail",
      "Gantt Detail",
      "report.ganttDetail",
      projectWorkstreams.length > 0 || projectEvents.length > 0
    ),
    section("next-steps", "Next Steps", "report.nextSteps", Boolean(reportingPack?.nextSteps)),
    section("management-ask", "Management Ask", "report.managementAsk", Boolean(reportingPack?.managementAsk)),
    section("conclusion", "Conclusion", "report.conclusion", Boolean(reportingPack?.conclusion)),
  ].filter((section) => section.visible);
}
