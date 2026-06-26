"use client";

import { Fragment, useMemo, useState } from "react";
import { useTranslation } from "@/components/i18n/TranslationProvider";
import { StandardTable } from "@/components/ui/TablePrimitives";
import { thStyle, tdStyle } from "@/components/ui/tableStyles";
import { h1Style, sectionHeaderStyle,
  sectionTitleStyle } from "@/components/ui/layoutStyles";
import {
  SectionHeaderActionButton,
  SectionHeaderActions,
} from "@/components/ui/SectionHeader";

type DateValue = Date | string | null | undefined;

type TimelineTask = {
  id: string;
  name: string;
  reportingName?: string | null;
  visibility?: string | null;
  plannedStartDate?: DateValue;
  plannedEndDate?: DateValue;
  actualStartDate?: DateValue;
  actualEndDate?: DateValue;
  subtasks?: TimelineTask[];
};

type TimelineWorkstream = {
  id: string;
  isActive?: boolean | null;
  reportingName?: string | null;
  customName?: string | null;
  visibility?: string | null;
  plannedStartDate?: DateValue;
  plannedEndDate?: DateValue;
  actualStartDate?: DateValue;
  actualEndDate?: DateValue;
  workstream?: {
    name?: string | null;
    phase?: { name?: string | null } | null;
  } | null;
  projectTasks?: TimelineTask[];
};

type TimelineEvent = {
  id: string;
  isActive?: boolean | null;
  name?: string | null;
  customName?: string | null;
  reportingName?: string | null;
  visibility?: string | null;
  eventDate?: DateValue;
  linkedProjectWorkstreamId?: string | null;
  actualDate?: DateValue;
  completedAt?: DateValue;
  isCompleted?: boolean | null;
  eventType?: { name?: string | null } | null;
};

type TimelineItem = {
  visibility?: string | null;
  plannedStartDate?: DateValue;
  plannedEndDate?: DateValue;
  actualStartDate?: DateValue;
  actualEndDate?: DateValue;
};

type ProjectTimelineProps = {
  projectWorkstreams: TimelineWorkstream[];
 projectEvents?: TimelineEvent[];
};

type TimelineViewMode = "ALL" | "EXECUTIVE" | "DETAILED";

function toDate(value: DateValue): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: DateValue): string {
  const date = toDate(value);
  if (!date) return "-";
  return date.toISOString().slice(0, 10);
}

function getWorkstreamDisplayName(pw: TimelineWorkstream) {
  return (
    pw.reportingName?.trim() ||
    pw.customName?.trim() ||
    pw.workstream?.name ||
    "-"
  );
}

function getTaskDisplayName(task: TimelineTask) {
  return task.reportingName?.trim() || task.name || "-";
}

function getEventDisplayName(event: TimelineEvent) {
  return (
    event.reportingName?.trim() ||
    event.customName?.trim() ||
    event.name ||
    event.eventType?.name ||
    "Milestone"
  );
}

function isVisibleInTimeline(item: { visibility?: string | null }, mode: TimelineViewMode) {
  const visibility = item.visibility ?? "BOTH";

  if (visibility === "HIDDEN") return false;
  if (mode === "ALL") return true;
  if (mode === "EXECUTIVE") {
    return visibility === "BOTH" || visibility === "EXECUTIVE";
  }
  if (mode === "DETAILED") {
    return visibility === "BOTH" || visibility === "DETAILED";
  }

  return true;
}

function isActiveTimelineItem(item: { isActive?: boolean | null }) {
  return item.isActive !== false;
}

function getTodayDate() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getWorkingDaysBetween(start: Date, end: Date) {
  const startDate = new Date(start);
  const endDate = new Date(end);

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  let count = 0;
  const current = new Date(startDate);

  while (current < endDate) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }

  return count;
}

function getTimelineBounds(projectWorkstreams: TimelineWorkstream[], today: Date, projectEvents: TimelineEvent[] = []) {
  const dates: Date[] = [];

  projectWorkstreams.forEach((pw) => {
    [
      pw.plannedStartDate,
      pw.plannedEndDate,
      pw.actualStartDate,
      pw.actualEndDate,
    ].forEach((value) => {
      const date = toDate(value);
      if (date) dates.push(date);
    });

    const plannedEnd = toDate(pw.plannedEndDate);

    if (plannedEnd && !pw.actualEndDate && today > plannedEnd) {
      dates.push(today);
    }

    (pw.projectTasks ?? []).forEach((task) => {
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

      (task.subtasks ?? []).forEach((subtask) => {
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

projectEvents.forEach((event) => {
  const date = toDate(event.eventDate);
  if (date) dates.push(date);
});

  if (dates.length === 0) return null;

  const minRaw = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxRaw = new Date(Math.max(...dates.map((d) => d.getTime())));

  return {
    min: startOfWeek(minRaw),
    max: addDays(startOfWeek(maxRaw), 6),
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

    if (last && last.label === label) {
      last.count += 1;
    } else {
      groups.push({ label, count: 1 });
    }
  });

  return groups;
}

function getBarStyle(startValue: DateValue, endValue: DateValue, min: Date, max: Date) {
  const start = toDate(startValue);
  const end = toDate(endValue);

  if (!start || !end) return { display: "none" };

  const total = max.getTime() - min.getTime();
  if (total <= 0) return { left: "0%", width: "100%" };

  const left = ((start.getTime() - min.getTime()) / total) * 100;
  const width = ((end.getTime() - start.getTime()) / total) * 100;

  return {
    left: `${Math.max(0, left)}%`,
    width: `${Math.max(2, width)}%`,
  };
}

function getTodayStyle(today: Date, min: Date, max: Date) {
  if (today < min || today > max) return { display: "none" };

  const total = max.getTime() - min.getTime();
  if (total <= 0) return { left: "0%" };

  const left = ((today.getTime() - min.getTime()) / total) * 100;

  return { left: `${left}%` };
}

function getEventStyle(eventDate: DateValue, min: Date, max: Date) {
  const date = toDate(eventDate);
  if (!date || date < min || date > max) return { display: "none" };

  const total = max.getTime() - min.getTime();
  if (total <= 0) return { left: "0%" };

  const left = ((date.getTime() - min.getTime()) / total) * 100;

  return { left: `${left}%` };
}

function groupByPhase(projectWorkstreams: TimelineWorkstream[]) {
  const groups: Record<string, TimelineWorkstream[]> = {};

  projectWorkstreams.forEach((pw) => {
    const phaseName = pw.workstream?.phase?.name ?? "No Phase";

    if (!groups[phaseName]) groups[phaseName] = [];
    groups[phaseName].push(pw);
  });

  return groups;
}

function getUnlinkedEvents(projectEvents: TimelineEvent[]) {
  return projectEvents.filter((event) => !event.linkedProjectWorkstreamId);
}

function getEventsForWorkstream(projectEvents: TimelineEvent[], projectWorkstreamId: string) {
  return projectEvents.filter(
    (event) => event.linkedProjectWorkstreamId === projectWorkstreamId
  );
}

function getVarianceLabel(pw: TimelineItem, today: Date) {
  const plannedStart = toDate(pw.plannedStartDate);
  const plannedEnd = toDate(pw.plannedEndDate);
  const actualStart = toDate(pw.actualStartDate);
  const actualEnd = toDate(pw.actualEndDate);

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

function getPhaseSummary(items: TimelineWorkstream[], today: Date) {
  const plannedStarts = items
    .map((pw) => toDate(pw.plannedStartDate))
    .filter(Boolean) as Date[];

  const plannedEnds = items
    .map((pw) => toDate(pw.plannedEndDate))
    .filter(Boolean) as Date[];

  const actualStarts = items
    .map((pw) => toDate(pw.actualStartDate))
    .filter(Boolean) as Date[];

  const actualEnds = items
    .map((pw) => toDate(pw.actualEndDate))
    .filter(Boolean) as Date[];

  const allCompleted =
    items.length > 0 && items.every((pw) => Boolean(pw.actualEndDate));

  const plannedStartDate =
    plannedStarts.length > 0
      ? new Date(Math.min(...plannedStarts.map((d) => d.getTime())))
      : null;

  const plannedEndDate =
    plannedEnds.length > 0
      ? new Date(Math.max(...plannedEnds.map((d) => d.getTime())))
      : null;

  const actualStartDate =
    actualStarts.length > 0
      ? new Date(Math.min(...actualStarts.map((d) => d.getTime())))
      : null;

  const actualEndDate =
    actualEnds.length > 0
      ? new Date(Math.max(...actualEnds.map((d) => d.getTime())))
      : null;

  const variances = items.map((pw) => getVarianceLabel(pw, today));
  const varianceLabels = variances.map((v) => v.label);
  const maxDaysDelayed = Math.max(
    0,
    ...variances.map((v) => v.daysDelayed ?? 0)
  );

  let label = "On track";
  let background = "#e0f2fe";

  if (varianceLabels.includes("Delayed")) {
    label = "Delayed";
    background = "#fee2e2";
  } else if (varianceLabels.includes("Review")) {
    label = "Review";
    background = "#fef3c7";
  } else if (varianceLabels.length > 0 && varianceLabels.every((v) => v === "Completed")) {
    label = "Completed";
    background = "#dcfce7";
  } else if (varianceLabels.length > 0 && varianceLabels.every((v) => v === "Not started")) {
    label = "Not started";
    background = "#f8fafc";
  }

  return {
    plannedStartDate,
    plannedEndDate,
    actualStartDate,
    actualEndDate,
    allCompleted,
    variance: {
      label,
      background,
      daysDelayed: maxDaysDelayed > 0 ? maxDaysDelayed : null,
    },
  };
}

const timelineCellStyle: React.CSSProperties = {
  position: "relative",
  height: "24px",
  minWidth: "520px",
  background: "#f8fafc",
  borderRadius: "4px",
  overflow: "hidden",
};

const plannedBarStyle: React.CSSProperties = {
  position: "absolute",
  top: "4px",
  height: "6px",
  borderRadius: "999px",
  background: "#9ca3af",
  zIndex: 1,
};

const progressBarStyle: React.CSSProperties = {
  position: "absolute",
  top: "14px",
  height: "6px",
  borderRadius: "999px",
  background: "#93c5fd",
  zIndex: 2,
};

const delayBarStyle: React.CSSProperties = {
  position: "absolute",
  top: "14px",
  height: "6px",
  borderRadius: "999px",
  background: "#ef4444",
  zIndex: 3,
};

const actualBarStyle: React.CSSProperties = {
  position: "absolute",
  top: "14px",
  height: "6px",
  borderRadius: "999px",
  background: "#2563eb",
  zIndex: 4,
};

const weekGridStyle: React.CSSProperties = {
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "1fr",
  height: "100%",
  position: "absolute",
  inset: 0,
};

const todayLineStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  bottom: 0,
  width: "2px",
  background: "#ef4444",
  zIndex: 5,
};

const milestoneMarkerStyle: React.CSSProperties = {
  position: "absolute",
  top: "2px",
  bottom: "2px",
  width: "2px",
  zIndex: 6,
};

const milestoneDotStyle: React.CSSProperties = {
  position: "absolute",
  top: "6px",
  left: "-5px",
  width: "10px",
  height: "10px",
  borderRadius: "999px",
};

function TimelineMilestoneMarker({
  event,
  bounds,
}: {
  event: TimelineEvent;
  bounds: { min: Date; max: Date };
}) {
  const isCompleted = Boolean(
    event.actualDate || event.completedAt || event.isCompleted
  );

  const color = isCompleted ? "#2563eb" : "#9ca3af";

  return (
    <div
      style={{
        ...milestoneMarkerStyle,
        ...getEventStyle(event.eventDate, bounds.min, bounds.max),
        background: color,
      }}
      title={`${getEventDisplayName(event)}: ${formatDate(event.eventDate)}`}
    >
      <div
        style={{
          ...milestoneDotStyle,
          background: color,
        }}
      />
    </div>
  );
}

function TimelineGrid({
  weeks,
  today,
  bounds,
}: {
  weeks: Date[];
  today: Date;
  bounds: { min: Date; max: Date };
}) {
  return (
    <>
      <div style={weekGridStyle}>
        {weeks.map((week) => (
          <div key={week.toISOString()} style={{ borderRight: "1px solid #e5e7eb" }} />
        ))}
      </div>

      <div
        style={{
          ...todayLineStyle,
          ...getTodayStyle(today, bounds.min, bounds.max),
        }}
        title="Today"
      />
    </>
  );
}

function TimelineBars({
  plannedStartDate,
  plannedEndDate,
  actualStartDate,
  actualEndDate,
  today,
  bounds,
  labelPrefix,
}: {
  plannedStartDate: DateValue;
  plannedEndDate: DateValue;
  actualStartDate: DateValue;
  actualEndDate: DateValue;
  today: Date;
  bounds: { min: Date; max: Date };
  labelPrefix: string;
}) {
  const plannedEnd = toDate(plannedEndDate);
  const isCompleted = Boolean(actualEndDate);
  const isInProgress = Boolean(actualStartDate) && !actualEndDate;
  const isDelayed = Boolean(plannedEnd) && !actualEndDate && today > plannedEnd!;

  return (
    <>
      <div
        style={{
          ...plannedBarStyle,
          ...getBarStyle(plannedStartDate, plannedEndDate, bounds.min, bounds.max),
        }}
        title={`${labelPrefix} planned: ${formatDate(plannedStartDate)} → ${formatDate(
          plannedEndDate
        )}`}
      />

      {isInProgress && (
        <div
          style={{
            ...progressBarStyle,
            ...getBarStyle(actualStartDate, today, bounds.min, bounds.max),
          }}
          title={`${labelPrefix} in progress: ${formatDate(actualStartDate)} → Today`}
        />
      )}

      {isDelayed && (
        <div
          style={{
            ...delayBarStyle,
            ...getBarStyle(plannedEndDate, today, bounds.min, bounds.max),
          }}
          title={`${labelPrefix} delayed: ${formatDate(plannedEndDate)} → Today`}
        />
      )}

      {isCompleted && (
        <div
          style={{
            ...actualBarStyle,
            ...getBarStyle(actualStartDate, actualEndDate, bounds.min, bounds.max),
          }}
          title={`${labelPrefix} completed: ${formatDate(actualStartDate)} → ${formatDate(
            actualEndDate
          )}`}
        />
      )}
    </>
  );
}

export function ProjectTimeline({ projectWorkstreams,
  projectEvents = [], }: ProjectTimelineProps) {
  const { t } = useTranslation();
  const [today] = useState<Date>(() => getTodayDate());

const [viewMode, setViewMode] = useState<TimelineViewMode>("ALL");

const activeProjectWorkstreams = useMemo(
  () => projectWorkstreams.filter(isActiveTimelineItem),
  [projectWorkstreams]
);

const activeWorkstreamIds = useMemo(
  () => new Set(activeProjectWorkstreams.map((workstream) => workstream.id)),
  [activeProjectWorkstreams]
);

const visibleProjectEvents = useMemo(
  () =>
    projectEvents.filter(
      (event) =>
        isActiveTimelineItem(event) &&
        isVisibleInTimeline(event, viewMode) &&
        (!event.linkedProjectWorkstreamId ||
          activeWorkstreamIds.has(event.linkedProjectWorkstreamId))
    ),
  [activeWorkstreamIds, projectEvents, viewMode]
);

const unlinkedProjectEvents = useMemo(
  () => getUnlinkedEvents(visibleProjectEvents),
  [visibleProjectEvents]
);

  const grouped = useMemo(
    () => groupByPhase(activeProjectWorkstreams),
[activeProjectWorkstreams]
  );

  const bounds = useMemo(
   () => getTimelineBounds(activeProjectWorkstreams, today, visibleProjectEvents),
[activeProjectWorkstreams, today, visibleProjectEvents]
  );

  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>(
    () => Object.fromEntries(Object.keys(grouped).map((phase) => [phase, false]))
  );

  if (!bounds) {
    return (
      <section style={{ marginTop: "2rem" }}>

 <div style={sectionHeaderStyle}>
  <div style={sectionTitleStyle}>{t("pages.projectTimeline")}</div>
</div>
        <p>No planned or actual dates have been entered yet.</p>
      </section>
    );
  }

  const weeks = getWeeks(bounds.min, bounds.max);
  const monthGroups = getMonthGroups(weeks);
  const phaseNames = Object.keys(grouped);
  const allPhasesExpanded =
    phaseNames.length > 0 &&
    phaseNames.every((phase) => expandedPhases[phase] ?? false);
  const allPhasesCollapsed =
    phaseNames.length === 0 ||
    phaseNames.every((phase) => !(expandedPhases[phase] ?? false));

  function togglePhase(phaseName: string) {
    setExpandedPhases((current) => ({
      ...current,
      [phaseName]: !(current[phaseName] ?? false),
    }));
  }

  function setAllPhases(expanded: boolean) {
    setExpandedPhases(
      Object.fromEntries(phaseNames.map((phase) => [phase, expanded]))
    );
  }

  return (
    <section style={{ marginTop: "2rem" }}>
      <h2 style={h1Style}>{t("pages.projectTimeline")}</h2>

      <div style={{ marginBottom: "0.75rem", fontSize: "0.9rem" }}>
        <strong>{t("timeline.range")}:</strong> {formatDate(bounds.min)} {"->"} {formatDate(bounds.max)}
        <span style={{ marginLeft: "1rem" }}>{t("timeline.legend.planned")}</span>
        <span style={{ marginLeft: "1rem" }}>{t("timeline.legend.inProgress")}</span>
        <span style={{ marginLeft: "1rem" }}>{t("timeline.legend.actual")}</span>
        <span style={{ marginLeft: "1rem" }}>{t("timeline.legend.delay")}</span>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "0.75rem",
          marginBottom: "1.75rem",
        }}
      >
        <SectionHeaderActions>
          <SectionHeaderActionButton
            onClick={() => setAllPhases(true)}
            inactive={allPhasesExpanded}
            labelKey="actions.expandAll"
          />

          <SectionHeaderActionButton
            onClick={() => setAllPhases(false)}
            inactive={allPhasesCollapsed}
            labelKey="actions.collapseAll"
          />
        </SectionHeaderActions>

        <SectionHeaderActions>
          {(["ALL", "EXECUTIVE", "DETAILED"] as TimelineViewMode[]).map((mode) => (
            <SectionHeaderActionButton
              key={mode}
              onClick={() => setViewMode(mode)}
              inactive={viewMode !== mode}
            >
              {mode === "ALL"
                ? t("timeline.all")
                : mode === "EXECUTIVE"
                  ? t("timeline.executive")
                  : t("timeline.detailed")}
            </SectionHeaderActionButton>
          ))}
        </SectionHeaderActions>
      </div>

      <StandardTable>
        <thead>
          <tr>
            <th style={thStyle}>{t("labels.phase")}</th>
            <th style={thStyle}>{t("labels.workstreamEvent")}</th>
            <th style={thStyle}>{t("labels.variance")}</th>
            <th style={thStyle}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${weeks.length}, 1fr)`,
                  minWidth: "520px",
                }}
              >
                {monthGroups.map((month) => (
                  <div
                    key={month.label}
                    style={{
                      gridColumn: `span ${month.count}`,
                      textAlign: "center",
                      borderRight: "1px solid #cbd5e1",
                      fontWeight: "bold",
                    }}
                  >
                    {month.label}
                  </div>
                ))}

                {weeks.map((week) => (
                  <div
                    key={week.toISOString()}
                    style={{
                      textAlign: "center",
                      borderRight: "1px solid #e5e7eb",
                      fontSize: "0.7rem",
                      fontWeight: "normal",
                      color: "#64748b",
                    }}
                  >
                    {week.getDate().toString().padStart(2, "0")}
                  </div>
                ))}
              </div>
            </th>
          </tr>
        </thead>

        <tbody>

{unlinkedProjectEvents.length > 0 &&
  unlinkedProjectEvents.map((event, index) => (    <tr key={`unlinked-event-${event.id}`}>
      <td
        style={{
          ...tdStyle,
          fontWeight: "bold",
          background: "#f8fafc",
          whiteSpace: "nowrap",
        }}
      >
        {index === 0 ? "MILESTONE" : ""}
      </td>

      <td style={tdStyle}>
  {getEventDisplayName(event)}
</td>

      <td style={tdStyle}></td>

      <td style={tdStyle}>
        <div style={timelineCellStyle}>
          <TimelineGrid weeks={weeks} today={today} bounds={bounds} />
          <TimelineMilestoneMarker event={event} bounds={bounds} />
        </div>
      </td>
    </tr>
  ))}

          {Object.entries(grouped).map(([phaseName, items]) => {
            const phaseSummary = getPhaseSummary(items, today);
            const isExpanded = expandedPhases[phaseName] ?? false;
            const visibleItems = items.filter((pw) =>
              isVisibleInTimeline(pw, viewMode)
            );


            return (
              <Fragment key={phaseName}>
                <tr onClick={() => togglePhase(phaseName)} style={{ cursor: "pointer" }}>
                  <td
                    style={{
                      ...tdStyle,
                      fontWeight: "bold",
                      background: "#f1f5f9",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isExpanded ? "▼" : "▶"} {phaseName.toUpperCase()}
                  </td>

                  <td
                    style={{
                      ...tdStyle,
                      fontWeight: "bold",
                      background: "#f1f5f9",
                    }}
                  >
                    Phase summary
                  </td>

                  <td
                    style={{
                      ...tdStyle,
                      background: phaseSummary.variance.background,
                      fontWeight: "bold",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {phaseSummary.variance.label}
                    {phaseSummary.variance.daysDelayed ? (
                      <span
                        style={{
                          color: "#b91c1c",
                          fontWeight: "bold",
                          marginLeft: "0.5rem",
                        }}
                      >
                        {phaseSummary.variance.daysDelayed}d
                      </span>
                    ) : null}
                  </td>

                  <td style={{ ...tdStyle, background: "#f1f5f9" }}>
                    <div style={timelineCellStyle}>
                      <TimelineGrid weeks={weeks} today={today} bounds={bounds} />

                      <TimelineBars
                        plannedStartDate={phaseSummary.plannedStartDate}
                        plannedEndDate={phaseSummary.plannedEndDate}
                        actualStartDate={phaseSummary.actualStartDate}
                        actualEndDate={phaseSummary.actualEndDate}
                        today={today}
                        bounds={bounds}
                        labelPrefix="Phase"
                      />
                    </div>
                  </td>
                </tr>


                {isExpanded &&
                  visibleItems.map((pw) => {
                    const variance = getVarianceLabel(pw, today);
                    const visibleTasks = getVisibleTasks(pw, viewMode);

                    return (
                      <Fragment key={`workstream-${pw.id}`}>
                      <tr>
                        <td style={tdStyle}></td>
                       <td style={tdStyle}>{getWorkstreamDisplayName(pw)}</td>

                        <td
                          style={{
                            ...tdStyle,
                            background: variance.background,
                            fontWeight: "bold",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {variance.label}
                          {variance.daysDelayed ? (
                            <span
                              style={{
                                color: "#b91c1c",
                                fontWeight: "bold",
                                marginLeft: "0.5rem",
                              }}
                            >
                              {variance.daysDelayed}d
                            </span>
                          ) : null}
                        </td>

                        <td style={tdStyle}>
                          <div style={timelineCellStyle}>
                            <TimelineGrid weeks={weeks} today={today} bounds={bounds} />

                            <TimelineBars
                              plannedStartDate={pw.plannedStartDate}
                              plannedEndDate={pw.plannedEndDate}
                              actualStartDate={pw.actualStartDate}
                              actualEndDate={pw.actualEndDate}
                              today={today}
                              bounds={bounds}
                              labelPrefix={getWorkstreamDisplayName(pw)}
                            />
{getEventsForWorkstream(visibleProjectEvents, pw.id).map((event) => (
  <TimelineMilestoneMarker key={`workstream-event-${pw.id}-${event.id}`} event={event} bounds={bounds} />
))}
                          </div>
                        </td>
                      </tr>
                      {visibleTasks.map((task) => {
                        const taskVariance = getVarianceLabel(task, today);
                        const visibleSubtasks = getVisibleSubtasks(task, viewMode);

                        return (
                          <Fragment key={`task-${task.id}`}>
                            <tr>
                              <td style={tdStyle}></td>
                              <td style={{ ...tdStyle, paddingLeft: "1.5rem" }}>
                                Task: {getTaskDisplayName(task)}
                              </td>
                              <td
                                style={{
                                  ...tdStyle,
                                  background: taskVariance.background,
                                  fontWeight: "bold",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {taskVariance.label}
                                {taskVariance.daysDelayed ? (
                                  <span
                                    style={{
                                      color: "#b91c1c",
                                      fontWeight: "bold",
                                      marginLeft: "0.5rem",
                                    }}
                                  >
                                    {taskVariance.daysDelayed}d
                                  </span>
                                ) : null}
                              </td>
                              <td style={tdStyle}>
                                <div style={timelineCellStyle}>
                                  <TimelineGrid weeks={weeks} today={today} bounds={bounds} />
                                  <TimelineBars
                                    plannedStartDate={task.plannedStartDate}
                                    plannedEndDate={task.plannedEndDate}
                                    actualStartDate={task.actualStartDate}
                                    actualEndDate={task.actualEndDate}
                                    today={today}
                                    bounds={bounds}
                                    labelPrefix={getTaskDisplayName(task)}
                                  />
                                </div>
                              </td>
                            </tr>
                            {visibleSubtasks.map((subtask) => {
                              const subtaskVariance = getVarianceLabel(subtask, today);

                              return (
                                <tr key={`subtask-${subtask.id}`}>
                                  <td style={tdStyle}></td>
                                  <td style={{ ...tdStyle, paddingLeft: "2.75rem" }}>
                                    Subtask: {subtask.name}
                                  </td>
                                  <td
                                    style={{
                                      ...tdStyle,
                                      background: subtaskVariance.background,
                                      fontWeight: "bold",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {subtaskVariance.label}
                                    {subtaskVariance.daysDelayed ? (
                                      <span
                                        style={{
                                          color: "#b91c1c",
                                          fontWeight: "bold",
                                          marginLeft: "0.5rem",
                                        }}
                                      >
                                        {subtaskVariance.daysDelayed}d
                                      </span>
                                    ) : null}
                                  </td>
                                  <td style={tdStyle}>
                                    <div style={timelineCellStyle}>
                                      <TimelineGrid weeks={weeks} today={today} bounds={bounds} />
                                      <TimelineBars
                                        plannedStartDate={subtask.plannedStartDate}
                                        plannedEndDate={subtask.plannedEndDate}
                                        actualStartDate={subtask.actualStartDate}
                                        actualEndDate={subtask.actualEndDate}
                                        today={today}
                                        bounds={bounds}
                                        labelPrefix={subtask.name}
                                      />
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </Fragment>
                        );
                      })}
                      </Fragment>
                    );
                  })}
              </Fragment>
            );
          })}
        </tbody>
      </StandardTable>
    </section>
  );
}

function getVisibleTasks(pw: TimelineWorkstream, viewMode: TimelineViewMode) {
  return (pw.projectTasks ?? []).filter((task) =>
    isVisibleInTimeline(task, viewMode)
  );
}

function getVisibleSubtasks(task: TimelineTask, viewMode: TimelineViewMode) {
  return (task.subtasks ?? []).filter((subtask) =>
    isVisibleInTimeline(subtask, viewMode)
  );
}
