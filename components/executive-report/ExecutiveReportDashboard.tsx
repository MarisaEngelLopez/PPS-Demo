"use client";

import { useState } from "react";
import { useTranslation } from "@/components/i18n/TranslationProvider";
import { tableStyle, thStyle, tdStyle } from "@/components/ui/tableStyles";
import { ExecutiveRiskAttentionTable } from "@/components/executive-report/ExecutiveRiskAttentionTable";
import {
  buildExecutiveRiskLifecycleLabels,
  ExecutiveRiskLifecycleSummary,
  ExecutiveRiskReviewDetail,
} from "@/components/executive-report/ExecutiveRiskLifecycle";
import { ExecutiveTimelineGantt } from "@/components/executive-report/ExecutiveTimelineGantt";
import { CockpitMetricGrid } from "@/components/executive-report/CockpitMetricGrid";
import {
  sectionHeaderStyle,
  sectionTitleStyle,
} from "@/components/ui/layoutStyles";
import { buildExecutiveReportViewModel } from "@/lib/domain/reporting/executiveReportViewModel";
import type {
  ExecutiveReportProject,
  ExecutiveReportReportingPack,
} from "@/lib/domain/reporting/executiveReportTypes";
import { getExecutiveReportSectionTitle } from "@/lib/reporting/executiveReportTranslations";

type Props = {
  project: ExecutiveReportProject;
  reportingPack?: ExecutiveReportReportingPack | null;
  riskReviewTypeHints?: string[];
  activeChapter?: ReportChapter;
};

export type ReportChapter =
  | "overview"
  | "decisions"
  | "risks"
  | "workstreams"
  | "gantt"
  | "narrative";

function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export default function ExecutiveReportDashboard({
  project,
  reportingPack,
  riskReviewTypeHints = [],
  activeChapter = "overview",
}: Props) {
const { t } = useTranslation();

const {
  executiveDecisionAttention,
  recentDecisionOutcomes,
  projectWorkstreams,
  projectEvents,
  riskLifecycleRows,
  managementReviewRisks,
  sections: reportSections,
  decisionCockpitMetrics,
  riskCockpitMetrics,
  workstreamCockpitMetrics,
  milestoneCockpitMetrics,
} = buildExecutiveReportViewModel({
  project,
  reportingPack: reportingPack ?? null,
});

const [showSideIndex, setShowSideIndex] = useState(true);
const riskLifecycleLabels = buildExecutiveRiskLifecycleLabels(t);
const sectionTitle = (id: string) =>
  getExecutiveReportSectionTitle(
    reportSections.find((section) => section.id === id) ?? { id, title: id },
    t
  );
const chapterTabs: { key: ReportChapter; label: string }[] = [
  { key: "overview", label: t("report.tabOverview") },
  { key: "decisions", label: t("report.tabDecisions") },
  { key: "risks", label: t("report.tabRisks") },
  { key: "workstreams", label: t("report.tabWorkstreamsMilestones") },
  { key: "gantt", label: t("report.tabGantt") },
  { key: "narrative", label: t("report.tabNarrative") },
];

  return (
<div className="page-shell">
  <section className="section-panel highlighted-section-panel">
  <div
    style={{
      minHeight: "220px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      textAlign: "center",
      padding: "2rem",
    }}
  >
    <div>
      <h1
        style={{
          fontSize: "2rem",
          fontWeight: 800,
          marginBottom: "0.5rem",
        }}
      >
        {project.name}
      </h1>

      <div
        style={{
          fontSize: "1.1rem",
          fontWeight: 600,
          color: "#475569",
        }}
      >
        {t("report.executiveReport")}
      </div>

      <div
        style={{
          marginTop: "0.5rem",
          fontSize: "0.9rem",
          color: "#64748b",
        }}
      >
        {project.projectCode}
      </div>
    </div>

    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        fontSize: "0.9rem",
        color: "#475569",
      }}
    >
      <div>
        {project.projectManagerContact?.name ??
          "—"}
      </div>
      <div>{formatDate(new Date())}</div>
    </div>
  </div>
</section>

{reportingPack && (
  <section id="executive-summary" className="section-panel">
    <div style={sectionHeaderStyle}>
      <div style={sectionTitleStyle}>
        Reporting Pack v{reportingPack.version} — {reportingPack.title}
      </div>
    </div>

  <div style={{ marginBottom: "0.75rem" }}>
 <div
  style={{
    display: "grid",
    gridTemplateColumns: showSideIndex ? "180px 1fr" : "1fr",
    gap: "1rem",
    alignItems: "start",
  }}
>
  {showSideIndex && (
  <aside
    style={{
      position: "sticky",
      top: "1rem",
      alignSelf: "start",
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: "12px",
      padding: "0.75rem",
      maxHeight: "calc(100vh - 2rem)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}
  >
    <div
      style={{
        fontSize: "0.78rem",
        fontWeight: 800,
        color: "#334155",
        marginBottom: "0.5rem",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      {t("report.index")}
    </div>


<button
      type="button"
      onClick={() => setShowSideIndex((current) => !current)}
      style={{
        border: "1px solid #cbd5e1",
        borderRadius: "8px",
        padding: "0.3rem 0.55rem",
        background: "#ffffff",
        fontSize: "0.72rem",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {showSideIndex ? t("report.singleView") : t("report.showIndex")}
    </button>

  <div
    style={{
      whiteSpace: "pre-wrap",
      fontSize: "0.82rem",
      lineHeight: 1.45,
      color: "#111827",
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      borderRadius: "8px",
      padding: "0.65rem",
      minHeight: 0,
      overflowY: "auto",
    }}
  >
    <ol
      style={{
        listStyle: "none",
        margin: 0,
        padding: 0,
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem",
      }}
    >
            {reportSections.map((section, index) => (
        <li key={section.id}>
          <a
            href={`#${section.id}`}
            style={{
              display: "flex",
              gap: "0.45rem",
              alignItems: "center",
              padding: "0.4rem 0.5rem",
              borderRadius: "8px",
              color: "#334155",
              textDecoration: "none",
              fontSize: "0.8rem",
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: "1.25rem",
                height: "1.25rem",
                borderRadius: "999px",
                background: "#f1f5f9",
                color: "#475569",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.7rem",
                fontWeight: 800,
              }}
            >
              {index + 1}
            </span>

    {getExecutiveReportSectionTitle(section, t)}
  </a>
</li>
      ))}
    </ol>
</div>
 </aside>
)}
<main>
  <div
    style={{
      position: "sticky",
      top: 0,
      zIndex: 5,
      display: "flex",
      flexWrap: "wrap",
      gap: "0.4rem",
      marginBottom: "1rem",
      padding: "0.5rem",
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      borderRadius: "10px",
    }}
  >
    {chapterTabs.map((chapter) => {
      const active = activeChapter === chapter.key;
      const href = `/executive-report?projectId=${project.id}${
        reportingPack?.id ? `&reportingPackId=${reportingPack.id}` : ""
      }&chapter=${chapter.key}`;

      return (
        <a
          key={chapter.key}
          href={href}
          style={{
            border: active ? "1px solid #2563eb" : "1px solid #cbd5e1",
            borderRadius: "8px",
            padding: "0.42rem 0.7rem",
            background: active ? "#dbeafe" : "#ffffff",
            color: active ? "#1e3a8a" : "#334155",
            cursor: "pointer",
            fontSize: "0.78rem",
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          {chapter.label}
        </a>
      );
    })}
  </div>

  {!showSideIndex && (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-start",
        marginBottom: "1rem",
      }}
    >
      <button
        type="button"
        onClick={() => setShowSideIndex(true)}
        style={{
          border: "1px solid #cbd5e1",
          borderRadius: "8px",
          padding: "0.35rem 0.65rem",
          background: "#ffffff",
          fontSize: "0.75rem",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {t("report.twoPanel")}
      </button>
    </div>
  )}

  {activeChapter === "overview" && (
    <>
    <ReportNarrativeBlock
id="executive-summary"
title={t("report.executiveSummary")}
text={reportingPack.executiveSummary}
/>
    <ReportNarrativeBlock
id="achievements"
title={t("report.achievements")}
text={reportingPack.achievements}
/>
    <ReportNarrativeBlock
id="issues"
title={t("report.issuesConcerns")}
text={reportingPack.issues} />

    </>
  )}

  {activeChapter === "decisions" && (
    <>
<section
id="decision-cockpit"
  style={{
    marginBottom: "1rem",
    padding: "0.75rem",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
  }}
>
  <div style={sectionHeaderStyle}>
    <div style={sectionTitleStyle}>{sectionTitle("decision-cockpit")}</div>
  </div>

  <CockpitMetricGrid metrics={decisionCockpitMetrics} />
</section>

{executiveDecisionAttention.length > 0 && (
  <section
id="decision-attention"
    style={{
      marginBottom: "1rem",
      padding: "0.75rem",
      borderRadius: "10px",
      border: "1px solid #e2e8f0",
      background: "#ffffff",
    }}
  >
    <div style={sectionHeaderStyle}>
      <div style={sectionTitleStyle}>{sectionTitle("decision-attention")}</div>
    </div>

    <table style={tableStyle}>
      <thead>
        <tr>
          <th style={thStyle}>{t("labels.title")}</th>
          <th style={thStyle}>{t("labels.recommendation")}</th>
          <th style={thStyle}>{t("labels.owner")}</th>
          <th style={thStyle}>{t("labels.dueDate")}</th>
          <th style={thStyle}>{t("labels.impact")}</th>
          <th style={thStyle}>{t("labels.status")}</th>
          <th style={thStyle}>{t("labels.esc")}</th>
        </tr>
      </thead>

      <tbody>
        {executiveDecisionAttention.map((decision) => (
          <tr key={decision.id}>
            <td style={tdStyle}>{decision.title}</td>
            <td style={tdStyle}>{decision.recommendation || "—"}</td>
            <td style={tdStyle}>{decision.owner || "—"}</td>
            <td style={tdStyle}>
              {decision.dueDate
                ? new Date(decision.dueDate).toISOString().slice(0, 10)
                : "—"}
            </td>
            <td style={tdStyle}>
  <ImpactChip impact={decision.impact} />
</td>
            <td style={tdStyle}>{decision.statusRef?.name ?? "—"}</td>
            <td style={tdStyle}>{decision.escalated ? "Yes" : ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>
)}

<section
id="decision-outcomes"
  style={{
    marginBottom: "1rem",
    padding: "0.75rem",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
  }}
>
  <div style={sectionHeaderStyle}>
    <div style={sectionTitleStyle}>{t("report.recentDecisionOutcomes")}</div>
  </div>

  {recentDecisionOutcomes.length === 0 ? (
    <div
      style={{
        padding: "0.75rem",
        borderRadius: "8px",
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        fontSize: "0.82rem",
        color: "#475569",
      }}
    >
      No decision outcomes recorded in the last 30 days.
    </div>
  ) : (
    <table style={tableStyle}>
      <thead>
        <tr>
          <th style={thStyle}>{t("labels.title")}</th>
          <th style={thStyle}>{t("labels.outcome")}</th>
          <th style={thStyle}>{t("labels.decisionDate")}</th>
          <th style={thStyle}>{t("labels.impact")}</th>
          <th style={thStyle}>{t("labels.status")}</th>
        </tr>
      </thead>

      <tbody>
        {recentDecisionOutcomes.map((decision) => (
          <tr key={decision.id}>
            <td style={tdStyle}>{decision.title}</td>
            <td style={tdStyle}>{decision.decision || "—"}</td>
            <td style={tdStyle}>
              {decision.decisionDate
                ? new Date(decision.decisionDate).toISOString().slice(0, 10)
                : decision.updatedAt
                  ? new Date(decision.updatedAt).toISOString().slice(0, 10)
                  : "—"}
            </td>
            <td style={tdStyle}>
              <ImpactChip impact={decision.impact} />
            </td>
            <td style={tdStyle}>{decision.statusRef?.name ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )}
</section>

    </>
  )}

{activeChapter === "risks" && (
  <>
<section
  id="risk-cockpit"
  style={{
    marginBottom: "1rem",
    padding: "0.75rem",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
  }}
>
<div style={sectionHeaderStyle}>
  <div style={sectionTitleStyle}>{sectionTitle("risk-cockpit")}</div>
</div>
  <p style={{ color: "#475569", fontSize: "0.82rem", margin: "0 0 0.55rem" }}>
    {t("report.riskSectionDescription")}
  </p>

  <CockpitMetricGrid metrics={riskCockpitMetrics} />
</section>

<section
  id="risk-attention"
  style={{
    marginBottom: "1rem",
    padding: "0.75rem",
    borderRadius: "10px",
    border: "1px solid #fed7aa",
    background: "#fff7ed",
  }}
>
  <ExecutiveRiskAttentionTable risks={project.projectRisks ?? []} />
</section>

<section
  id="risk-lifecycle-summary"
  style={{
    marginBottom: "1rem",
    padding: "0.75rem",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
  }}
>
  <div style={sectionHeaderStyle}>
    <div style={sectionTitleStyle}>{sectionTitle("risk-lifecycle-summary")}</div>
  </div>
  <ExecutiveRiskLifecycleSummary
    rows={riskLifecycleRows}
    labels={riskLifecycleLabels}
  />
</section>

{managementReviewRisks.length > 0 && (
  <span id="risk-management-review" style={{ position: "relative", top: "-1rem" }} />
)}

{managementReviewRisks.map(({ risk }) => (
  <section
    id={`risk-review-${risk.id}`}
    key={risk.id}
    style={{
      marginBottom: "1rem",
      padding: "0.75rem",
      borderRadius: "10px",
      border: "1px solid #fde68a",
      background: "#fffbeb",
    }}
  >
    <div style={sectionHeaderStyle}>
      <div style={sectionTitleStyle}>
        {sectionTitle("risk-management-review")}: {risk.riskCode ?? "Risk"} {risk.title}
      </div>
    </div>
    <ExecutiveRiskReviewDetail
      risk={risk}
      reviewTypeHints={riskReviewTypeHints}
      labels={riskLifecycleLabels}
    />
  </section>
))}

  </>
)}

{activeChapter === "workstreams" && (
<>
<section
  id="workstreams"
  style={{
    marginBottom: "1rem",
    padding: "0.75rem",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
  }}
>
<div style={sectionHeaderStyle}>
  <div style={sectionTitleStyle}>{sectionTitle("workstreams")}</div>
</div>

  <CockpitMetricGrid metrics={workstreamCockpitMetrics} />
</section>

<section
  id="milestones"
  style={{
    marginBottom: "1rem",
    padding: "0.75rem",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
  }}
>
<div style={sectionHeaderStyle}>
  <div style={sectionTitleStyle}>{sectionTitle("milestones")}</div>
</div>

  <CockpitMetricGrid metrics={milestoneCockpitMetrics} />
</section>
</>
)}

{activeChapter === "gantt" && (
<section id="gantt-detail">
<ExecutiveTimelineGantt
  projectWorkstreams={projectWorkstreams}
  projectEvents={projectEvents}
/>
</section>
)}

{activeChapter === "narrative" && reportingPack && (
  <section className="section-panel">
    <div style={sectionHeaderStyle}>
      <div style={sectionTitleStyle}>{t("report.forwardLookingNarrative")}</div>
    </div>

    <ReportNarrativeBlock
id="next-steps"
title={t("report.nextSteps")}
text={reportingPack.nextSteps}
/>
    <ReportNarrativeBlock
id="management-ask"
title={t("report.managementAsk")}
text={reportingPack.managementAsk}
/>
    <ReportNarrativeBlock
id="conclusion"
title={t("report.conclusion")}
text={reportingPack.conclusion}
/>
  </section>
)}
</main>
    </div>
</div>
</section>
)}
</div>
  );
}

function ReportNarrativeBlock({
  id,
  title,
  text,
}: {
  id?: string;
  title: string;
  text?: string | null;
}) {
  if (!text) return null;

    return (
  <div id={id} style={{ marginBottom: "0.75rem" }}>
      <div
        style={{
          fontSize: "0.8rem",
          fontWeight: 700,
          color: "#334155",
          marginBottom: "0.25rem",
        }}
      >
        {title}
      </div>

      <div
        style={{
          whiteSpace: "pre-wrap",
          fontSize: "0.82rem",
          lineHeight: 1.45,
          color: "#111827",
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "0.65rem",
        }}
      >
        {text}
      </div>
    </div>
  );
}


function ImpactChip({ impact }: { impact: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    LOW: {
      bg: "#dcfce7",
      color: "#166534",
    },
    MEDIUM: {
      bg: "#fef3c7",
      color: "#92400e",
    },
    HIGH: {
      bg: "#fed7aa",
      color: "#9a3412",
    },
    CRITICAL: {
      bg: "#fecaca",
      color: "#991b1b",
    },
  };

  const style = styles[impact] || {
    bg: "#e2e8f0",
    color: "#334155",
  };

  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.18rem 0.5rem",
        borderRadius: "999px",
        fontSize: "0.72rem",
        fontWeight: 700,
        background: style.bg,
        color: style.color,
        whiteSpace: "nowrap",
      }}
    >
      {impact}
    </span>
  );
}
