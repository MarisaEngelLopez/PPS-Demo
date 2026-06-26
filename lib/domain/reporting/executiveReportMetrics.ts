import type {
  ExecutiveReportEvent,
  ExecutiveReportProject,
  ExecutiveReportWorkstream,
} from "@/lib/domain/reporting/executiveReportTypes";
import {
  getWorkstreamStatus,
  isActiveWorkstream,
  isClosedRisk,
  isOpenMilestone,
  isOpenRiskAction,
  isRiskOverdue,
  isRiskDueThisMonth,
  isWorkstreamOverdue,
} from "@/lib/domain/reporting/executiveReportRules";

export function getRiskGroups(project: ExecutiveReportProject, today = new Date()) {
  const activeRisks = project.projectRisks.filter((risk) => !isClosedRisk(risk));
  const closedRisks = project.projectRisks.filter(isClosedRisk);
  const redRisks = activeRisks.filter((risk) => risk.exposure >= 15);
  const escalatedRisks = activeRisks.filter((risk) => risk.escalated);
  const dueThisMonthRisks = activeRisks.filter((risk) =>
    isRiskDueThisMonth(risk, today)
  );
  const overdueRisks = activeRisks.filter((risk) => isRiskOverdue(risk, today));
  const overdueRiskActions = activeRisks.flatMap((risk) =>
    (risk.riskActions ?? []).filter((action) => {
      if (!action.dueDate) return false;
      if (!isOpenRiskAction(action)) return false;
      const dueDate = new Date(action.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const reference = new Date(today);
      reference.setHours(0, 0, 0, 0);
      return dueDate < reference;
    })
  );

  return {
    activeRisks,
    closedRisks,
    redRisks,
    escalatedRisks,
    dueThisMonthRisks,
    overdueRisks,
    overdueRiskActions,
  };
}

export function getWorkstreamHealthCounts(
  workstreams: ExecutiveReportWorkstream[]
) {
  const activeWorkstreams = workstreams.filter(isActiveWorkstream);
  const statuses = activeWorkstreams.map(getWorkstreamStatus);

  return {
    completed: statuses.filter((status) => status === "Completed").length,
    delayed: activeWorkstreams.filter((workstream) =>
      isWorkstreamOverdue(workstream)
    ).length,
    inProgress: statuses.filter((status) => status === "In Progress").length,
    notStarted: statuses.filter((status) => status === "Not Started").length,
    onTrack: 0,
  };
}

export function getMilestoneGroups(events: ExecutiveReportEvent[]) {
  const today = new Date();

  return {
    upcomingMilestones: events.filter(
      (event) =>
        isOpenMilestone(event) &&
        event.eventDate &&
        new Date(event.eventDate) >= today
    ),
    overdueMilestones: events.filter(
      (event) =>
        isOpenMilestone(event) &&
        event.eventDate &&
        new Date(event.eventDate) < today
    ),
    completedMilestones: events.filter((event) => event.isCompleted),
    openMilestones: events.filter(isOpenMilestone),
  };
}

export function getExecutiveReportMetrics(project: ExecutiveReportProject) {
  const riskGroups = getRiskGroups(project);
  const healthCounts = getWorkstreamHealthCounts(project.projectWorkstreams);
  const milestoneGroups = getMilestoneGroups(project.events);

  return {
    riskGroups,
    healthCounts,
    milestoneGroups,
  };
}
