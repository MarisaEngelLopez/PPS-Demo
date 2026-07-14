"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
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
import { findManagedNarrativeAsset } from "@/lib/domain/narrative/narrativeRepository";
import { resolveNarrativePresentationMode } from "@/lib/domain/narrative/narrativeDocument";
import { buildExecutiveReportViewModel } from "@/lib/domain/reporting/executiveReportViewModel";
import { buildExecutiveBriefingModel } from "@/lib/domain/reporting/executiveBriefingModel";
import type {
  ExecutiveReportProject,
  ExecutiveReportReportingPack,
} from "@/lib/domain/reporting/executiveReportTypes";
import { getExecutiveReportSectionTitle } from "@/lib/reporting/executiveReportTranslations";
import {
  getNarrativePresentationItems,
  type NarrativePresentationMode,
} from "@/lib/domain/reporting/narrativePresentation";

type Props = {
  project: ExecutiveReportProject;
  reportingPack?: ExecutiveReportReportingPack | null;
  riskReviewTypeHints?: string[];
  activeChapter?: ReportChapter;
  embedded?: boolean;
};

export type ReportChapter =
  | "briefing"
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
  embedded = false,
}: Props) {
const { t, locale } = useTranslation();

const reportViewModel = buildExecutiveReportViewModel({
  project,
  reportingPack: reportingPack ?? null,
  includeDraftNarratives: true,
});
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
  narrativeAssets,
} = reportViewModel;
const briefing = buildExecutiveBriefingModel({
  project,
  reportingPack: reportingPack ?? null,
  report: reportViewModel,
  locale,
});

const [showSideIndex, setShowSideIndex] = useState(true);
const riskLifecycleLabels = buildExecutiveRiskLifecycleLabels(t);
const sectionTitle = (id: string) =>
  getExecutiveReportSectionTitle(
    reportSections.find((section) => section.id === id) ?? { id, title: id },
    t
  );
const detailedNarrativeAsset = (
  objectKey:
    | "executive-summary"
    | "accomplishments"
    | "issues-concerns"
    | "next-steps"
    | "management-ask"
    | "conclusion"
) =>
  findManagedNarrativeAsset(narrativeAssets, {
    objectKey,
    variant: "DETAILED",
  });
const detailedNarrative = (objectKey: Parameters<typeof detailedNarrativeAsset>[0]) =>
  detailedNarrativeAsset(objectKey)?.content ?? null;
const detailedNarrativeMode = (objectKey: Parameters<typeof detailedNarrativeAsset>[0]) =>
  resolveNarrativePresentationMode({
    preference: detailedNarrativeAsset(objectKey)?.presentationMode,
    objectKey,
  });
const chapterTabs: { key: ReportChapter; label: string }[] = [
  { key: "briefing", label: t("report.tabBriefing") },
  { key: "overview", label: t("report.tabOverview") },
  { key: "decisions", label: t("report.tabDecisions") },
  { key: "risks", label: t("report.tabRisks") },
  { key: "workstreams", label: t("report.tabWorkstreamsMilestones") },
  { key: "gantt", label: t("report.tabGantt") },
  { key: "narrative", label: t("report.tabNarrative") },
];
const briefingText = (en: string, es: string) => (locale === "es" ? es : en);

  return (
<div className={`page-shell${embedded ? " embedded-executive-briefing" : ""}`}>
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
text={detailedNarrative("executive-summary")}
mode={detailedNarrativeMode("executive-summary")}
/>
    <ReportNarrativeBlock
id="achievements"
title={t("report.achievements")}
text={detailedNarrative("accomplishments")}
mode={detailedNarrativeMode("accomplishments")}
/>
    <ReportNarrativeBlock
id="issues"
title={t("report.issuesConcerns")}
text={detailedNarrative("issues-concerns")}
mode={detailedNarrativeMode("issues-concerns")} />

    </>
  )}

  {activeChapter === "briefing" && (
    <section
      id="executive-briefing"
      style={{
        background: "#ffffff",
        display: "grid",
        gap: "0.8rem",
      }}
    >
      <div style={{ borderBottom: "2px solid #2563eb", padding: "0 0 0.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "start", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "1.15rem", fontWeight: 800 }}>{t("report.executiveBriefing")}</div>
            <div style={{ color: "#475569", marginTop: "0.2rem", maxWidth: "760px" }}>
              {(locale === "es" ? project.descriptionEs : project.description) || project.description || "—"}
            </div>
          </div>
          <HealthBadge value={project.healthStatus} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: "0.45rem", marginTop: "0.65rem" }}>
          <BriefingFact label={briefingText("Current phase", "Fase actual")} value={briefing.currentPhase} />
          <BriefingFact label={t("labels.projectManager")} value={project.projectManagerContact?.name ?? "—"} />
          <BriefingFact label={t("labels.sponsorContact")} value={project.sponsorContact?.name ?? "—"} />
          <BriefingFact label={briefingText("Last report", "Último informe")} value={reportingPack ? formatDate(reportingPack.reportingDate) : "—"} />
        </div>
      </div>

      <BriefingOperationalSection title={briefingText("Phase Timeline", "Cronograma de fases")} subtitle={briefingText("Where are we in the project journey?", "¿En qué punto del recorrido del proyecto estamos?")} href={`/projects/${project.id}?view=management#workstreams`}>
        <div style={{ maxWidth: "100%", overflowX: "auto" }}>
          <ExecutiveTimelineGantt
            projectWorkstreams={projectWorkstreams}
            projectEvents={briefing.timelineEvents}
            briefingMode
          />
        </div>
      </BriefingOperationalSection>

      <div className="briefing-content-grid">
        <BriefingOperationalSection title={t("report.executiveSummary")} subtitle={briefingText("Overall project status and current management focus.", "Estado general del proyecto y foco actual de gestión.")}>
          <BriefingNarrativeSection title="" text={briefing.narratives.executiveSummary} checkpoints />
        </BriefingOperationalSection>

        <BriefingOperationalSection title={briefingText("Delivery Status", "Estado de entrega")} subtitle={briefingText("How is execution progressing?", "¿Cómo avanza la ejecución?")} href={`/projects/${project.id}?view=management#workstreams`}>
          <div style={{ display: "grid", gap: "0.45rem" }}>
            <CockpitMetricGrid metrics={workstreamCockpitMetrics} />
            <CockpitMetricGrid metrics={milestoneCockpitMetrics} />
          </div>
        </BriefingOperationalSection>

        <BriefingOperationalSection title={briefingText("Project Pulse", "Pulso del proyecto")} subtitle={briefingText("What has changed since the previous reporting period?", "¿Qué ha cambiado desde el periodo de informe anterior?")}>
          <BriefingMetricRow items={[
            ...briefing.pulse.map((item) => [item.label, item.value] as [string, number]),
          ]} />
        </BriefingOperationalSection>

        <BriefingOperationalSection title={t("report.progressSinceLastReport")} subtitle={briefingText("Major capabilities and business outcomes delivered.", "Principales capacidades y resultados de negocio entregados.")}>
          <BriefingNarrativeSection title="" text={briefing.narratives.progressSinceLastReport} />
        </BriefingOperationalSection>

        <BriefingOperationalSection title={briefingText("Risks", "Riesgos")} subtitle={briefingText("What could threaten project success?", "¿Qué podría amenazar el éxito del proyecto?")} href="/risks">
          {briefing.primaryRisk ? (
            <PriorityItem title={briefing.primaryRisk.title} detail={`${briefingText("Exposure", "Exposición")}: ${briefing.primaryRisk.exposure ?? briefing.primaryRisk.probability * briefing.primaryRisk.impact}`} />
          ) : <CockpitMetricGrid metrics={riskCockpitMetrics} />}
        </BriefingOperationalSection>

        <BriefingOperationalSection title={briefingText("Decisions", "Decisiones")} subtitle={briefingText("Which decisions require management?", "¿Qué decisiones requieren a dirección?")} href="/decisions">
          {briefing.primaryDecision ? (
            <PriorityItem title={briefing.primaryDecision.title} detail={briefing.primaryDecision.recommendation || briefingText("Executive action required", "Se requiere actuación ejecutiva")} />
          ) : <CockpitMetricGrid metrics={decisionCockpitMetrics} />}
        </BriefingOperationalSection>
        <BriefingOperationalSection title={t("report.issuesConcerns")} subtitle={briefingText("Current concerns affecting project delivery.", "Preocupaciones actuales que afectan a la entrega.")}>
          <BriefingNarrativeSection title="" text={briefing.narratives.issuesConcerns} />
        </BriefingOperationalSection>
        <BriefingOperationalSection title={t("report.nextSteps")} subtitle={briefingText("Planned activities for the next reporting period.", "Actividades previstas para el próximo periodo.")}>
          <BriefingNarrativeSection title="" text={briefing.narratives.nextSteps} />
        </BriefingOperationalSection>
        <div className="briefing-half-row">
          <BriefingOperationalSection title={t("report.managementAsk")} subtitle={briefingText("Management decisions or support required.", "Decisiones o apoyo requerido de dirección.")}>
            <BriefingNarrativeSection title="" text={briefing.narratives.managementAsk} />
          </BriefingOperationalSection>
        </div>
        <div className="briefing-half-row">
          <BriefingOperationalSection title={t("report.conclusion")} subtitle={briefingText("Overall project assessment.", "Evaluación general del proyecto.")}>
            <BriefingNarrativeSection title="" text={briefing.narratives.conclusion} checkpoints />
          </BriefingOperationalSection>
        </div>
      </div>
    </section>
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
text={detailedNarrative("next-steps")}
mode={detailedNarrativeMode("next-steps")}
/>
    <ReportNarrativeBlock
id="management-ask"
title={t("report.managementAsk")}
text={detailedNarrative("management-ask")}
mode={detailedNarrativeMode("management-ask")}
/>
    <ReportNarrativeBlock
id="conclusion"
title={t("report.conclusion")}
text={detailedNarrative("conclusion")}
mode={detailedNarrativeMode("conclusion")}
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
  mode = "BULLETS",
}: {
  id?: string;
  title: string;
  text?: string | null;
  mode?: NarrativePresentationMode;
}) {
  if (!text) return null;
  const items = getNarrativePresentationItems(text, mode);

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
          fontSize: "0.82rem",
          lineHeight: 1.45,
          color: "#111827",
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "0.65rem",
          minHeight: mode === "CHECKPOINTS" ? "180px" : undefined,
          display: "flex",
          alignItems: mode === "CHECKPOINTS" ? "center" : "flex-start",
          justifyContent: "center",
        }}
      >
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            width: mode === "CHECKPOINTS" ? "min(760px, 90%)" : "100%",
            display: "grid",
            gap: mode === "CHECKPOINTS" ? "0.75rem" : "0.4rem",
          }}
        >
          {items.map((item, index) => (
            <li
              key={`${item.text}-${index}`}
              style={{
                textAlign: "left",
                fontSize: mode === "CHECKPOINTS" ? "0.95rem" : "0.82rem",
                fontWeight: mode === "CHECKPOINTS" ? 600 : 400,
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1.25rem 1fr", gap: "0.45rem" }}>
                <span style={{ color: mode === "CHECKPOINTS" ? "#15803d" : "#475569", fontWeight: 800 }}>
                  {mode === "CHECKPOINTS" ? "✓" : "•"}
                </span>
                <span>{item.text}</span>
              </div>
              {item.children.length > 0 && (
                <ul style={{ listStyle: "none", margin: "0.35rem 0 0 1.7rem", padding: 0, display: "grid", gap: "0.25rem", fontWeight: 400 }}>
                  {item.children.map((child, childIndex) => (
                    <li key={`${child}-${childIndex}`} style={{ display: "grid", gridTemplateColumns: "1rem 1fr", gap: "0.35rem" }}>
                      <span style={{ color: "#64748b" }}>◦</span>
                      <span>{child}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function BriefingOperationalSection({
  title,
  subtitle,
  href,
  children,
}: {
  title: string;
  subtitle: string;
  href?: string;
  children: ReactNode;
}) {
  return (
    <section style={{ borderTop: "1px solid #cbd5e1", padding: "0.7rem 0 0.2rem", minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "start", marginBottom: "0.5rem" }}>
        <div>
          <div style={{ fontSize: "0.86rem", fontWeight: 800, color: "#0f172a" }}>{title}</div>
          <div style={{ color: "#64748b", fontSize: "0.72rem", marginTop: "0.12rem" }}>{subtitle}</div>
        </div>
        {href && <Link href={href} style={{ color: "#1d4ed8", fontSize: "0.72rem", fontWeight: 700, whiteSpace: "nowrap" }}>Open →</Link>}
      </div>
      {children}
    </section>
  );
}

function BriefingFact({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ borderLeft: "2px solid #cbd5e1", paddingLeft: "0.45rem", minWidth: 0 }}>
      <div style={{ color: "#64748b", fontSize: "0.65rem", fontWeight: 700 }}>{label}</div>
      <div style={{ color: "#0f172a", fontSize: "0.78rem", fontWeight: 700, overflowWrap: "anywhere" }}>{value}</div>
    </div>
  );
}

function HealthBadge({ value }: { value: string }) {
  const colors = value === "RED"
    ? { background: "#fee2e2", color: "#991b1b", border: "#fecaca" }
    : value === "AMBER"
      ? { background: "#fef3c7", color: "#92400e", border: "#fde68a" }
      : { background: "#dcfce7", color: "#166534", border: "#bbf7d0" };
  return <span style={{ ...colors, border: `1px solid ${colors.border}`, borderRadius: "8px", padding: "0.35rem 0.6rem", fontSize: "0.72rem", fontWeight: 800 }}>{value}</span>;
}

function BriefingMetricRow({ items }: { items: Array<[string, number]> }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.4rem" }}>
      {items.map(([label, value]) => (
        <div key={label} style={{ alignItems: "center", border: "1px solid #e2e8f0", borderRadius: "6px", display: "flex", justifyContent: "space-between", minHeight: "32px", padding: "0.35rem 0.45rem", background: "#f8fafc", gap: "0.35rem" }}>
          <div style={{ color: "#64748b", fontSize: "0.65rem", fontWeight: 700 }}>{label}</div>
          <div style={{ color: "#0f172a", fontSize: "0.86rem", fontWeight: 800 }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

function PriorityItem({ title, detail }: { title: string; detail: string }) {
  return (
    <div style={{ borderLeft: "4px solid #f97316", background: "#fff7ed", padding: "0.55rem 0.65rem" }}>
      <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#9a3412" }}>{title}</div>
      <div style={{ fontSize: "0.72rem", color: "#475569", marginTop: "0.18rem" }}>{detail}</div>
    </div>
  );
}

function BriefingNarrativeSection({
  title,
  text,
  checkpoints = false,
}: {
  title: string;
  text?: string | null;
  checkpoints?: boolean;
}) {
  if (!text) return null;
  const items = getNarrativePresentationItems(
    text,
    checkpoints ? "CHECKPOINTS" : "BULLETS"
  );

  return (
    <section style={{ paddingBottom: "0.2rem" }}>
      {title && <div style={{ fontSize: "0.76rem", fontWeight: 800, color: "#334155", textTransform: "uppercase", marginBottom: "0.35rem" }}>{title}</div>}
      <div style={{ display: "grid", gap: "0.28rem", fontSize: "0.78rem", lineHeight: 1.35 }}>
        {items.map((item, index) => (
          <div key={`${item.text}-${index}`}>
            <div style={{ display: "grid", gridTemplateColumns: "1rem 1fr", gap: "0.3rem" }}>
              <span style={{ color: checkpoints ? "#15803d" : "#475569", fontWeight: 800 }}>
                {checkpoints ? "✓" : "•"}
              </span>
              <span>{item.text}</span>
            </div>
            {item.children.map((child, childIndex) => (
              <div key={`${child}-${childIndex}`} style={{ display: "grid", gridTemplateColumns: "1rem 1fr", gap: "0.3rem", marginLeft: "1.3rem", marginTop: "0.18rem", color: "#334155" }}>
                <span>◦</span>
                <span>{child}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
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
