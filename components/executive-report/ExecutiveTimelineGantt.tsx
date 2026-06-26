"use client";

import { useMemo, useState } from "react";
import { tableStyle, tdStyle, thStyle } from "@/components/ui/tableStyles";
import {
  buttonStyle,
  sectionHeaderStyle,
  sectionTitleStyle,
} from "@/components/ui/layoutStyles";
import {
  buildExecutiveGanttModel,
  type ExecutiveGanttBar,
  type ExecutiveGanttMarker,
  type ExecutiveGanttModel,
  type ExecutiveGanttViewMode,
} from "@/lib/domain/reporting/executiveGanttModel";
import type {
  ExecutiveReportEvent,
  ExecutiveReportWorkstream,
} from "@/lib/domain/reporting/executiveReportTypes";
import { useTranslation } from "@/components/i18n/TranslationProvider";

type ExecutiveTimelineGanttProps = {
  projectWorkstreams: ExecutiveReportWorkstream[];
  projectEvents?: ExecutiveReportEvent[];
};

const timelineCellStyle: React.CSSProperties = {
  position: "relative",
  height: "24px",
  minWidth: "520px",
  background: "#f8fafc",
  borderRadius: "4px",
  overflow: "hidden",
};

const weekGridStyle: React.CSSProperties = {
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "1fr",
  height: "100%",
  position: "absolute",
  inset: 0,
};

const barStyles: Record<ExecutiveGanttBar["kind"], React.CSSProperties> = {
  planned: {
    position: "absolute",
    top: "4px",
    height: "6px",
    borderRadius: "999px",
    background: "#9ca3af",
    zIndex: 1,
  },
  progress: {
    position: "absolute",
    top: "14px",
    height: "6px",
    borderRadius: "999px",
    background: "#93c5fd",
    zIndex: 2,
  },
  delay: {
    position: "absolute",
    top: "14px",
    height: "6px",
    borderRadius: "999px",
    background: "#ef4444",
    zIndex: 3,
  },
  actual: {
    position: "absolute",
    top: "14px",
    height: "6px",
    borderRadius: "999px",
    background: "#2563eb",
    zIndex: 4,
  },
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toISOString().slice(0, 10);
}

function translateVarianceLabel(
  label: ExecutiveGanttModel["rows"][number]["variance"] extends infer V
    ? V extends { label: infer L }
      ? L
      : never
    : never,
  t: ReturnType<typeof useTranslation>["t"]
) {
  switch (label) {
    case "Completed":
      return t("timeline.variance.completed");
    case "Delayed":
      return t("timeline.variance.delayed");
    case "No plan":
      return t("timeline.variance.noPlan");
    case "Not started":
      return t("timeline.variance.notStarted");
    case "On track":
      return t("timeline.variance.onTrack");
    case "Review":
      return t("timeline.variance.review");
    default:
      return label;
  }
}

function TimelineGrid({ model }: { model: ExecutiveGanttModel }) {
  return (
    <>
      <div style={weekGridStyle}>
        {model.weeks.map((week) => (
          <div
            key={week.toISOString()}
            style={{ borderRight: "1px solid #e5e7eb" }}
          />
        ))}
      </div>
      {model.todayLeftPct !== null && (
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${model.todayLeftPct}%`,
            width: "2px",
            background: "#ef4444",
            zIndex: 5,
          }}
          title="Today"
        />
      )}
    </>
  );
}

function TimelineBars({ bars }: { bars: ExecutiveGanttBar[] }) {
  return (
    <>
      {bars.map((bar) => (
        <div
          key={`${bar.kind}-${bar.start.toISOString()}-${bar.end.toISOString()}`}
          style={{
            ...barStyles[bar.kind],
            left: `${bar.leftPct}%`,
            width: `${bar.widthPct}%`,
          }}
          title={`${bar.kind}: ${formatDate(bar.start)} -> ${formatDate(bar.end)}`}
        />
      ))}
    </>
  );
}

function TimelineMarkers({ markers }: { markers: ExecutiveGanttMarker[] }) {
  return (
    <>
      {markers.map((marker) => {
        const color = marker.completed ? "#2563eb" : "#9ca3af";

        return (
          <div
            key={`marker-${marker.id}-${marker.leftPct}`}
            style={{
              position: "absolute",
              top: "2px",
              bottom: "2px",
              left: `${marker.leftPct}%`,
              width: "2px",
              background: color,
              zIndex: 6,
            }}
            title={`${marker.label}: ${formatDate(marker.date)}`}
          >
            <div
              style={{
                position: "absolute",
                top: "6px",
                left: "-5px",
                width: "10px",
                height: "10px",
                borderRadius: "999px",
                background: color,
              }}
            />
          </div>
        );
      })}
    </>
  );
}

export function ExecutiveTimelineGantt({
  projectWorkstreams,
  projectEvents = [],
}: ExecutiveTimelineGanttProps) {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ExecutiveGanttViewMode>("EXECUTIVE");
  const model = useMemo(
    () =>
      buildExecutiveGanttModel({
        projectWorkstreams,
        projectEvents,
        mode: viewMode,
      }),
    [projectWorkstreams, projectEvents, viewMode]
  );

  if (!model) {
    return (
      <section className="section-panel">
        <div style={sectionHeaderStyle}>
          <div style={sectionTitleStyle}>{t("report.timeline")}</div>
        </div>
        <p>{t("report.noRiskLifecycleItems")}</p>
      </section>
    );
  }

  const localizedLegend = [
    t("timeline.legend.planned"),
    t("timeline.legend.inProgress"),
    t("timeline.legend.actual"),
    t("timeline.legend.delay"),
  ];

  return (
    <section className="section-panel">
      <div
        style={{
          ...sectionHeaderStyle,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={sectionTitleStyle}>{t("report.timeline")}</div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {(["EXECUTIVE", "DETAILED", "ALL"] as ExecutiveGanttViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              style={{
                ...buttonStyle,
                opacity: viewMode === mode ? 1 : 0.65,
              }}
            >
              {mode === "EXECUTIVE"
                ? t("timeline.executive")
                : mode === "DETAILED"
                  ? t("timeline.detailed")
                  : t("timeline.all")}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          marginBottom: "0.75rem",
          fontSize: "0.85rem",
          color: "#475569",
        }}
      >
        <strong>{t("timeline.range")}:</strong> {formatDate(model.min)} {"->"} {formatDate(model.max)}
        {localizedLegend.map((item) => (
          <span key={item} style={{ marginLeft: "1rem" }}>
            {item}
          </span>
        ))}
      </div>

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={{ ...thStyle, textAlign: "left" }}>
              {t("labels.phase")}
            </th>
            <th style={{ ...thStyle, textAlign: "left" }}>
              {t("labels.workstreamEvent")}
            </th>
            <th style={{ ...thStyle, textAlign: "left" }}>
              {t("labels.variance")}
            </th>
            <th style={{ ...thStyle, textAlign: "left" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${model.weeks.length}, 1fr)`,
                  minWidth: "520px",
                }}
              >
                {model.monthGroups.map((month) => (
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
                {model.weeks.map((week) => (
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
          {model.rows.map((row) => (
            <tr key={`gantt-row-${row.id}`}>
              <td
                style={{
                  ...tdStyle,
                  fontWeight: row.kind === "phase" || row.kind === "milestone" ? "bold" : undefined,
                  background: row.kind === "phase" ? "#f1f5f9" : row.background,
                  whiteSpace: "nowrap",
                }}
              >
                {row.kind === "phase" ? `▼ ${row.phase}` : row.phase}
              </td>
              <td
                style={{
                  ...tdStyle,
                  fontWeight:
                    row.kind === "phase" || row.kind === "workstream"
                      ? "bold"
                      : undefined,
                  background: row.kind === "phase" ? "#f1f5f9" : undefined,
                  paddingLeft:
                    row.kind === "task"
                      ? "1.5rem"
                      : row.kind === "subtask"
                        ? "2.75rem"
                        : undefined,
                }}
              >
                {row.kind === "task" ? `${t("labels.task")}: ` : row.kind === "subtask" ? `${t("labels.subtask")}: ` : ""}
                {row.name}
              </td>
              <td
                style={{
                  ...tdStyle,
                  background: row.variance?.background,
                  fontWeight: row.variance ? "bold" : undefined,
                  whiteSpace: "nowrap",
                }}
              >
                {row.variance ? translateVarianceLabel(row.variance.label, t) : ""}
                {row.variance?.daysDelayed ? (
                  <span
                    style={{
                      color: "#b91c1c",
                      fontWeight: "bold",
                      marginLeft: "0.5rem",
                    }}
                  >
                    {row.variance.daysDelayed}d
                  </span>
                ) : null}
              </td>
              <td
                style={{
                  ...tdStyle,
                  background: row.kind === "phase" ? "#f1f5f9" : undefined,
                }}
              >
                <div style={timelineCellStyle}>
                  <TimelineGrid model={model} />
                  <TimelineBars bars={row.bars} />
                  <TimelineMarkers markers={row.markers} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
