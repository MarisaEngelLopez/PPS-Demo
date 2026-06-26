import type {
  ExecutiveReportEvent,
  ExecutiveReportWorkstream,
} from "@/lib/domain/reporting/executiveReportTypes";
import { EXECUTIVE_GANTT_OUTPUT_CONTRACT } from "@/lib/domain/reporting/executiveGanttOutputContract";
import { isActiveEvent, isActiveWorkstream } from "./executiveReportRules";

export type ExecutiveGanttViewMode = "EXECUTIVE" | "DETAILED" | "ALL";

export type ExecutiveGanttVariance = {
  label: "Completed" | "Delayed" | "Not started" | "On track" | "Review" | "No plan";
  background: string;
  daysDelayed: number | null;
};

export type ExecutiveGanttBar = {
  kind: "planned" | "progress" | "actual" | "delay";
  start: Date;
  end: Date;
  leftPct: number;
  widthPct: number;
};

export type ExecutiveGanttMarker = {
  id: string;
  label: string;
  date: Date;
  leftPct: number;
  completed: boolean;
};

export type ExecutiveGanttRow =
  | {
      id: string;
      kind: "milestone";
      phase: string;
      name: string;
      variance: null;
      bars: [];
      markers: ExecutiveGanttMarker[];
      background: string;
    }
  | {
      id: string;
      kind: "phase";
      phase: string;
      name: string;
      variance: ExecutiveGanttVariance;
      bars: ExecutiveGanttBar[];
      markers: ExecutiveGanttMarker[];
      background: string;
      expanded: boolean;
    }
  | {
      id: string;
      kind: "workstream" | "task" | "subtask";
      phase: string;
      name: string;
      variance: ExecutiveGanttVariance;
      bars: ExecutiveGanttBar[];
      markers: ExecutiveGanttMarker[];
      background: string;
      source: ExecutiveReportWorkstream;
      level?: number;
    };

export type ExecutiveGanttModel = {
  today: Date;
  min: Date;
  max: Date;
  weeks: Date[];
  monthGroups: { label: string; count: number }[];
  todayLeftPct: number | null;
  rows: ExecutiveGanttRow[];
  legend: string[];
};

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfWeek(date: Date) {
  const next = startOfDay(date);
  const day = next.getDay();
  next.setDate(next.getDate() + (day === 0 ? -6 : 1 - day));
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getWorkingDaysBetween(start: Date, end: Date) {
  const current = startOfDay(start);
  const endDate = startOfDay(end);
  let count = 0;

  while (current < endDate) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count += 1;
    current.setDate(current.getDate() + 1);
  }

  return count;
}

function isVisibleInTimeline(
  item: { visibility?: string | null },
  mode: ExecutiveGanttViewMode
) {
  const visibility = item.visibility ?? "BOTH";
  if (visibility === "HIDDEN") return false;
  if (mode === "ALL") return true;
  if (mode === "DETAILED") return visibility === "BOTH" || visibility === "DETAILED";
  return visibility === "BOTH" || visibility === "EXECUTIVE";
}

function getWorkstreamName(workstream: ExecutiveReportWorkstream) {
  return (
    workstream.reportingName?.trim() ||
    workstream.customName?.trim() ||
    workstream.workstream?.name ||
    "-"
  );
}

type ExecutiveGanttTask = ExecutiveReportWorkstream["projectTasks"][number];

function getTaskName(task: ExecutiveGanttTask) {
  return task.reportingName?.trim() || task.name || "-";
}

function getEventName(event: ExecutiveReportEvent) {
  return (
    event.reportingName?.trim() ||
    event.customName?.trim() ||
    event.name ||
    event.eventType?.name ||
    "Milestone"
  );
}

function getBounds(
  workstreams: ExecutiveReportWorkstream[],
  events: ExecutiveReportEvent[],
  today: Date
) {
  const dates: Date[] = [];

  workstreams.forEach((workstream) => {
    [
      workstream.plannedStartDate,
      workstream.plannedEndDate,
      workstream.actualStartDate,
      workstream.actualEndDate,
    ].forEach((value) => {
      const date = toDate(value);
      if (date) dates.push(date);
    });

    const plannedEnd = toDate(workstream.plannedEndDate);
    if (plannedEnd && !workstream.actualEndDate && today > plannedEnd) {
      dates.push(today);
    }

    workstream.projectTasks?.forEach((task) => {
      [
        task.plannedStartDate,
        task.plannedEndDate,
        task.actualStartDate,
        task.actualEndDate,
      ].forEach((value) => {
        const date = toDate(value);
        if (date) dates.push(date);
      });

      const taskPlannedEnd = toDate(task.plannedEndDate);
      if (taskPlannedEnd && !task.actualEndDate && today > taskPlannedEnd) {
        dates.push(today);
      }

      task.subtasks?.forEach((subtask) => {
        [
          subtask.plannedStartDate,
          subtask.plannedEndDate,
          subtask.actualStartDate,
          subtask.actualEndDate,
        ].forEach((value) => {
          const date = toDate(value);
          if (date) dates.push(date);
        });

        const subtaskPlannedEnd = toDate(subtask.plannedEndDate);
        if (subtaskPlannedEnd && !subtask.actualEndDate && today > subtaskPlannedEnd) {
          dates.push(today);
        }
      });
    });
  });

  events.forEach((event) => {
    const date = toDate(event.eventDate);
    if (date) dates.push(date);
  });

  if (dates.length === 0) return null;

  return {
    min: startOfWeek(new Date(Math.min(...dates.map((date) => date.getTime())))),
    max: addDays(
      startOfWeek(new Date(Math.max(...dates.map((date) => date.getTime())))),
      6
    ),
  };
}

function getWeeks(min: Date, max: Date) {
  const weeks: Date[] = [];
  let current = new Date(min);

  while (current <= max) {
    weeks.push(new Date(current));
    current = addDays(current, 7);
  }

  return weeks;
}

function getMonthGroups(weeks: Date[]) {
  const groups: { label: string; count: number }[] = [];

  weeks.forEach((week) => {
    const label = week.toLocaleString("en-GB", {
      month: "short",
      year: "numeric",
    });
    const last = groups[groups.length - 1];

    if (last?.label === label) {
      last.count += 1;
    } else {
      groups.push({ label, count: 1 });
    }
  });

  return groups;
}

function getLeftPct(date: Date, min: Date, max: Date) {
  const total = max.getTime() - min.getTime();
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, ((date.getTime() - min.getTime()) / total) * 100));
}

function getBar(
  kind: ExecutiveGanttBar["kind"],
  startValue: Date | string | null | undefined,
  endValue: Date | string | null | undefined,
  min: Date,
  max: Date
): ExecutiveGanttBar | null {
  const start = toDate(startValue);
  const end = toDate(endValue);
  if (!start || !end) return null;

  const leftPct = getLeftPct(start, min, max);
  const endPct = getLeftPct(end, min, max);

  return {
    kind,
    start,
    end,
    leftPct,
    widthPct: Math.max(2, endPct - leftPct),
  };
}

function getVariance(
  workstream: Pick<
    ExecutiveReportWorkstream,
    "plannedStartDate" | "plannedEndDate" | "actualStartDate" | "actualEndDate"
  >,
  today: Date
): ExecutiveGanttVariance {
  const plannedStart = toDate(workstream.plannedStartDate);
  const plannedEnd = toDate(workstream.plannedEndDate);
  const actualStart = toDate(workstream.actualStartDate);
  const actualEnd = toDate(workstream.actualEndDate);

  if (!plannedStart || !plannedEnd) {
    return { label: "No plan", background: "#f8fafc", daysDelayed: null };
  }
  if (actualEnd) {
    return { label: "Completed", background: "#dcfce7", daysDelayed: null };
  }
  if (today > plannedEnd) {
    return {
      label: "Delayed",
      background: "#fee2e2",
      daysDelayed: getWorkingDaysBetween(plannedEnd, today),
    };
  }
  if (!actualStart && today < plannedStart) {
    return { label: "Not started", background: "#f8fafc", daysDelayed: null };
  }
  if (today >= plannedStart && today <= plannedEnd) {
    return { label: "On track", background: "#e0f2fe", daysDelayed: null };
  }
  return { label: "Review", background: "#fef3c7", daysDelayed: null };
}

function getBars(
  workstream: Pick<
    ExecutiveReportWorkstream,
    "plannedStartDate" | "plannedEndDate" | "actualStartDate" | "actualEndDate"
  >,
  today: Date,
  min: Date,
  max: Date
) {
  const bars = [
    getBar("planned", workstream.plannedStartDate, workstream.plannedEndDate, min, max),
  ].filter(Boolean) as ExecutiveGanttBar[];

  const plannedEnd = toDate(workstream.plannedEndDate);
  const isCompleted = Boolean(workstream.actualEndDate);
  const isInProgress = Boolean(workstream.actualStartDate) && !workstream.actualEndDate;
  const isDelayed = Boolean(plannedEnd) && !workstream.actualEndDate && today > plannedEnd!;

  if (isInProgress) {
    const progress = getBar("progress", workstream.actualStartDate, today, min, max);
    if (progress) bars.push(progress);
  }
  if (isDelayed) {
    const delay = getBar("delay", workstream.plannedEndDate, today, min, max);
    if (delay) bars.push(delay);
  }
  if (isCompleted) {
    const actual = getBar("actual", workstream.actualStartDate, workstream.actualEndDate, min, max);
    if (actual) bars.push(actual);
  }

  return bars;
}

function getGroupedWorkstreams(workstreams: ExecutiveReportWorkstream[]) {
  const groups = new Map<string, ExecutiveReportWorkstream[]>();

  [...workstreams]
    .sort((a, b) => {
      const phaseA = a.workstream?.phase?.sortOrder ?? 999;
      const phaseB = b.workstream?.phase?.sortOrder ?? 999;
      const wsA = a.workstream?.sortOrder ?? 999;
      const wsB = b.workstream?.sortOrder ?? 999;
      return phaseA === phaseB ? wsA - wsB : phaseA - phaseB;
    })
    .forEach((workstream) => {
      const phaseName = workstream.workstream?.phase?.name ?? "No Phase";
      groups.set(phaseName, [...(groups.get(phaseName) ?? []), workstream]);
    });

  return groups;
}

function getPhaseSummary(
  phaseName: string,
  workstreams: ExecutiveReportWorkstream[],
  today: Date,
  min: Date,
  max: Date
): ExecutiveGanttRow {
  const dateValues = (field: keyof ExecutiveReportWorkstream) =>
    workstreams
      .map((workstream) => toDate(workstream[field] as Date | string | null))
      .filter(Boolean) as Date[];

  const minDate = (dates: Date[]) =>
    dates.length ? new Date(Math.min(...dates.map((date) => date.getTime()))) : null;
  const maxDate = (dates: Date[]) =>
    dates.length ? new Date(Math.max(...dates.map((date) => date.getTime()))) : null;

  const summary = {
    plannedStartDate: minDate(dateValues("plannedStartDate")),
    plannedEndDate: maxDate(dateValues("plannedEndDate")),
    actualStartDate: minDate(dateValues("actualStartDate")),
    actualEndDate: maxDate(dateValues("actualEndDate")),
  };

  const variances = workstreams.map((workstream) => getVariance(workstream, today));
  const labels = variances.map((variance) => variance.label);
  const maxDaysDelayed = Math.max(0, ...variances.map((variance) => variance.daysDelayed ?? 0));

  let variance: ExecutiveGanttVariance = {
    label: "On track",
    background: "#e0f2fe",
    daysDelayed: null,
  };

  if (labels.includes("Delayed")) {
    variance = {
      label: "Delayed",
      background: "#fee2e2",
      daysDelayed: maxDaysDelayed || null,
    };
  } else if (labels.every((label) => label === "Completed")) {
    variance = { label: "Completed", background: "#dcfce7", daysDelayed: null };
  } else if (labels.every((label) => label === "Not started")) {
    variance = { label: "Not started", background: "#f8fafc", daysDelayed: null };
  } else if (labels.includes("Review")) {
    variance = { label: "Review", background: "#fef3c7", daysDelayed: null };
  }

  return {
    id: `phase-${phaseName}`,
    kind: "phase",
    phase: phaseName,
    name: "Phase summary",
    variance,
    bars: getBars(summary, today, min, max),
    markers: [],
    background: "#f1f5f9",
    expanded: true,
  };
}

function getMarkers(
  events: ExecutiveReportEvent[],
  min: Date,
  max: Date
): ExecutiveGanttMarker[] {
  return events
    .map((event) => {
      const date = toDate(event.eventDate);
      if (!date) return null;
      return {
        id: event.id,
        label: getEventName(event),
        date,
        leftPct: getLeftPct(date, min, max),
        completed: Boolean(event.isCompleted),
      };
    })
    .filter(Boolean) as ExecutiveGanttMarker[];
}

function getVisibleTasks(workstream: ExecutiveReportWorkstream, mode: ExecutiveGanttViewMode) {
  return (workstream.projectTasks ?? []).filter((task) =>
    isVisibleInTimeline(task, mode)
  );
}

function getVisibleSubtasks(task: ExecutiveGanttTask, mode: ExecutiveGanttViewMode) {
  return (task.subtasks ?? []).filter((subtask) =>
    isVisibleInTimeline(subtask, mode)
  );
}

export function buildExecutiveGanttModel({
  projectWorkstreams,
  projectEvents = [],
  mode = "EXECUTIVE",
  today = new Date(),
}: {
  projectWorkstreams: ExecutiveReportWorkstream[];
  projectEvents?: ExecutiveReportEvent[];
  mode?: ExecutiveGanttViewMode;
  today?: Date;
}): ExecutiveGanttModel | null {
  const normalizedToday = startOfDay(today);
  const activeWorkstreams = projectWorkstreams.filter(isActiveWorkstream);
  const activeWorkstreamIds = new Set(
    activeWorkstreams.map((workstream) => workstream.id)
  );
  const visibleEvents = projectEvents.filter(
    (event) =>
      isActiveEvent(event) &&
      isVisibleInTimeline(event, mode) &&
      (!event.linkedProjectWorkstreamId ||
        activeWorkstreamIds.has(event.linkedProjectWorkstreamId))
  );
  const bounds = getBounds(activeWorkstreams, visibleEvents, normalizedToday);

  if (!bounds) return null;

  const groupedWorkstreams = getGroupedWorkstreams(activeWorkstreams);
  const rows: ExecutiveGanttRow[] = [];
  const unlinkedEvents = visibleEvents.filter(
    (event) => !event.linkedProjectWorkstreamId
  );

  unlinkedEvents.forEach((event, index) => {
    rows.push({
      id: `milestone-${event.id}`,
      kind: "milestone",
      phase: index === 0 ? "MILESTONES" : "",
      name: getEventName(event),
      variance: null,
      bars: [],
      markers: getMarkers([event], bounds.min, bounds.max),
      background: index === 0 ? "#f8fafc" : "#ffffff",
    });
  });

  groupedWorkstreams.forEach((workstreams, phaseName) => {
    rows.push(
      getPhaseSummary(phaseName, workstreams, normalizedToday, bounds.min, bounds.max)
    );

    workstreams
      .filter((workstream) => isVisibleInTimeline(workstream, mode))
      .forEach((workstream) => {
        rows.push({
          id: `workstream-${workstream.id}`,
          kind: "workstream",
          phase: "",
          name: getWorkstreamName(workstream),
          variance: getVariance(workstream, normalizedToday),
          bars: getBars(workstream, normalizedToday, bounds.min, bounds.max),
          markers: getMarkers(
            visibleEvents.filter(
              (event) => event.linkedProjectWorkstreamId === workstream.id
            ),
            bounds.min,
            bounds.max
          ),
          background: "#ffffff",
          source: workstream,
        });

      getVisibleTasks(workstream, mode).forEach((task) => {
        rows.push({
          id: `task-${task.id}`,
          kind: "task",
          phase: "",
          name: getTaskName(task),
          variance: getVariance(task, normalizedToday),
          bars: getBars(task, normalizedToday, bounds.min, bounds.max),
          markers: [],
          background: "#ffffff",
          source: workstream,
          level: 1,
        });

        getVisibleSubtasks(task, mode).forEach((subtask) => {
          rows.push({
            id: `subtask-${subtask.id}`,
            kind: "subtask",
            phase: "",
            name: subtask.name,
            variance: getVariance(subtask, normalizedToday),
            bars: getBars(subtask, normalizedToday, bounds.min, bounds.max),
            markers: [],
            background: "#ffffff",
            source: workstream,
            level: 2,
          });
        });
      });
    });
  });

  return {
    today: normalizedToday,
    min: bounds.min,
    max: bounds.max,
    weeks: getWeeks(bounds.min, bounds.max),
    monthGroups: getMonthGroups(getWeeks(bounds.min, bounds.max)),
    todayLeftPct:
      normalizedToday >= bounds.min && normalizedToday <= bounds.max
        ? getLeftPct(normalizedToday, bounds.min, bounds.max)
        : null,
    rows,
    legend: [...EXECUTIVE_GANTT_OUTPUT_CONTRACT.legend],
  };
}
