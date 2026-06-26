import type {
  ExecutiveReportDecision,
  ExecutiveReportEvent,
  ExecutiveReportRisk,
  ExecutiveReportRiskAction,
  ExecutiveReportWorkstream,
} from "@/lib/domain/reporting/executiveReportTypes";
import { statusMatchesSemantic } from "./statusUsageSemantics";

export function formatReportDate(value?: string | Date | null) {
  if (!value) return "-";
  return new Date(value).toISOString().slice(0, 10);
}

export function formatReportMonthYear(value?: string | Date | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

export function isExecutiveVisible(item: { visibility?: string | null }) {
  return item.visibility === "BOTH" || item.visibility === "EXECUTIVE";
}

export function isClosedRisk(risk: ExecutiveReportRisk) {
  return statusMatchesSemantic(
    risk.status,
    "RISK",
    "isClosed",
    ["CLOSE", "CLOSED"]
  );
}

export function isOpenRiskAction(action: ExecutiveReportRiskAction) {
  return !statusMatchesSemantic(
    action.statusRef,
    "RISK_ACTION",
    "isClosed",
    ["DONE", "CANCELLED", "CLOSED", "CLOSE"]
  );
}

export function hasOverdueRiskAction(risk: ExecutiveReportRisk, today = new Date()) {
  return (risk.riskActions ?? []).some((action) => {
    if (!action.dueDate) return false;
    if (!isOpenRiskAction(action)) return false;
    return new Date(action.dueDate) < today;
  });
}

export function isRiskDueThisMonth(risk: ExecutiveReportRisk, today = new Date()) {
  if (!risk.targetResolutionDate) return false;

  const target = new Date(risk.targetResolutionDate);

  return (
    target.getMonth() === today.getMonth() &&
    target.getFullYear() === today.getFullYear()
  );
}

export function isRiskOverdue(risk: ExecutiveReportRisk, today = new Date()) {
  if (!risk.targetResolutionDate) return false;
  const target = new Date(risk.targetResolutionDate);
  target.setHours(0, 0, 0, 0);
  const reference = new Date(today);
  reference.setHours(0, 0, 0, 0);

  return target < reference;
}

export function requiresExecutiveRiskAttention(
  risk: ExecutiveReportRisk,
  today = new Date()
) {
  if (isClosedRisk(risk)) return false;

  const exposure = risk.exposure ?? risk.probability * risk.impact;
  const isRed = exposure >= 15;
  const isAmber = exposure >= 7;

  return (
    isRed ||
    risk.escalated ||
    hasOverdueRiskAction(risk, today) ||
    isRiskDueThisMonth(risk, today) ||
    (isAmber &&
      (risk.escalated ||
        hasOverdueRiskAction(risk, today) ||
        isRiskDueThisMonth(risk, today)))
  );
}

export function isInProgressDecision(decision: ExecutiveReportDecision) {
  return !(
    statusMatchesSemantic(decision.statusRef, "DECISION", "isClosed", [
      "APPROVED",
      "CLOSED",
      "CLOSE",
      "DONE",
    ]) ||
    statusMatchesSemantic(decision.statusRef, "DECISION", "isNegative", [
      "REJECTED",
      "CANCELLED",
    ])
  );
}

export function requiresExecutiveDecisionAttention(
  decision: ExecutiveReportDecision
) {
  return decision.escalated && isInProgressDecision(decision);
}

export function getWorkstreamStatus(workstream: ExecutiveReportWorkstream) {
  if (workstream.actualEndDate) return "Completed";
  if (workstream.actualStartDate && !workstream.actualEndDate) {
    return "In Progress";
  }
  return "Not Started";
}

export function isActiveWorkstream(workstream: { isActive?: boolean | null }) {
  return workstream.isActive !== false;
}

export function isActiveEvent(event: { isActive?: boolean | null }) {
  return event.isActive !== false;
}

export function isWorkstreamOverdue(
  workstream: Pick<ExecutiveReportWorkstream, "plannedEndDate" | "actualEndDate">,
  today = new Date()
) {
  if (!workstream.plannedEndDate || workstream.actualEndDate) return false;

  const plannedEnd = new Date(workstream.plannedEndDate);
  plannedEnd.setHours(0, 0, 0, 0);
  const reference = new Date(today);
  reference.setHours(0, 0, 0, 0);

  return plannedEnd < reference;
}

export function isOpenMilestone(event: ExecutiveReportEvent) {
  return !event.isCompleted;
}
