"use client";

import { Fragment, useMemo, useState } from "react";
import { tableStyle, thStyle, tdStyle } from "@/components/ui/tableStyles";
import { h1Style, buttonStyle } from "@/components/ui/layoutStyles";

type ProjectTimelineProps = {
  projectWorkstreams: any[];
 projectEvents?: any[];
};

function toDate(value: any): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: any): string {
  const date = toDate(value);
  if (!date) return "-";
  return date.toISOString().slice(0, 10);
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

function getTimelineBounds(projectWorkstreams: any[], today: Date, projectEvents: any[] = []) {
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

function getBarStyle(startValue: any, endValue: any, min: Date, max: Date) {
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

function getEventStyle(eventDate: any, min: Date, max: Date) {
  const date = toDate(eventDate);
  if (!date || date < min || date > max) return { display: "none" };

  const total = max.getTime() - min.getTime();
  if (total <= 0) return { left: "0%" };

  const left = ((date.getTime() - min.getTime()) / total) * 100;

  return { left: `${left}%` };
}

function groupByPhase(projectWorkstreams: any[]) {
  const groups: Record<string, any[]> = {};

  projectWorkstreams.forEach((pw) => {
    const phaseName = pw.workstream?.phase?.name ?? "No Phase";

    if (!groups[phaseName]) groups[phaseName] = [];
    groups[phaseName].push(pw);
  });

  return groups;
}

function getVarianceLabel(pw: any, today: Date) {
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

function getPhaseSummary(items: any[], today: Date) {
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

const milestoneLabelStyle: React.CSSProperties = {
  position: "absolute",
  top: "16px",
  left: "6px",
  fontSize: "0.68rem",
  whiteSpace: "nowrap",
  color: "#334155",
};

function TimelineMilestoneMarker({
  event,
  bounds,
}: {
  event: any;
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
      title={`${event.eventType?.name ?? event.name ?? "Milestone"}: ${formatDate(
        event.eventDate
      )}`}
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
  plannedStartDate: any;
  plannedEndDate: any;
  actualStartDate: any;
  actualEndDate: any;
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
  const [today] = useState<Date>(() => getTodayDate());

  const grouped = useMemo(
    () => groupByPhase(projectWorkstreams),
    [projectWorkstreams]
  );

  const bounds = useMemo(
    () => getTimelineBounds(projectWorkstreams, today, projectEvents),
  [projectWorkstreams, today, projectEvents]
  );

  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>(
    () => Object.fromEntries(Object.keys(grouped).map((phase) => [phase, false]))
  );

  if (!bounds) {
    return (
      <section style={{ marginTop: "2rem" }}>
        <h2 style={h1Style}>Project Timeline</h2>
        <p>No planned or actual dates have been entered yet.</p>
      </section>
    );
  }

  const weeks = getWeeks(bounds.min, bounds.max);
  const monthGroups = getMonthGroups(weeks);
  const phaseNames = Object.keys(grouped);

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
      <h2 style={h1Style}>Project Timeline</h2>

      <div style={{ marginBottom: "0.75rem", fontSize: "0.9rem" }}>
        <strong>Range:</strong> {formatDate(bounds.min)} → {formatDate(bounds.max)}
        <span style={{ marginLeft: "1rem" }}>Grey = planned</span>
        <span style={{ marginLeft: "1rem" }}>Light blue = in progress</span>
        <span style={{ marginLeft: "1rem" }}>Blue = actual</span>
        <span style={{ marginLeft: "1rem" }}>Red = delay / today</span>
      </div>

      <div style={{ marginBottom: "1.75rem" }}>
        <button
          type="button"
          onClick={() => setAllPhases(true)}
          style={{ ...buttonStyle, marginRight: "0.5rem" }}
        >
          Expand all
        </button>

        <button type="button" onClick={() => setAllPhases(false)} style={buttonStyle}>
          Collapse all
        </button>
      </div>

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Phase</th>
            <th style={thStyle}>Workstream / Event</th>
            <th style={thStyle}>Variance</th>
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

{projectEvents.length > 0 &&
  projectEvents.map((event, index) => (
    <tr key={event.id}>
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
        {event.eventType?.name ?? event.name ?? "Milestone"}
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
                  items.map((pw: any) => {
                    const variance = getVarianceLabel(pw, today);

                    return (
                      <tr key={pw.id}>
                        <td style={tdStyle}></td>
                        <td style={tdStyle}>{pw.workstream?.name ?? "-"}</td>

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
                              labelPrefix="Workstream"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}