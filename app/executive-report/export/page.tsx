import { ExecutiveTimelineGantt } from "@/components/executive-report/ExecutiveTimelineGantt";
import {
  buildExecutiveRiskLifecycleLabels,
  ExecutiveRiskLifecycleSummary,
  ExecutiveRiskReviewDetail,
} from "@/components/executive-report/ExecutiveRiskLifecycle";
import { PrintButton } from "@/components/executive-report/PrintButton";
import {
  getExecutiveReportProject,
  getExecutiveReportProjectOptions,
  getExecutiveRiskReviewTypeOptions,
  getSelectedExecutiveProjectId,
  getSelectedReportingPack,
} from "@/lib/domain/reporting/executiveReportQueries";
import {
  formatReportDate as formatDate,
  formatReportMonthYear as formatMonthYear,
} from "@/lib/domain/reporting/executiveReportRules";
import { buildExecutiveReportViewModel } from "@/lib/domain/reporting/executiveReportViewModel";
import {
  cockpitMetricToneColors,
  sortCockpitMetrics,
  type CockpitMetric,
  type CockpitMetricGroup,
} from "@/lib/domain/reporting/cockpitMetrics";
import { chunkNarrativeText } from "@/lib/domain/reporting/narrativePagination";
import type {
  ExecutiveReportDecision,
  ExecutiveReportProject,
  ExecutiveReportRisk,
} from "@/lib/domain/reporting/executiveReportTypes";
import {
  sectionHeaderStyle,
  sectionTitleStyle,
} from "@/components/ui/layoutStyles";
import { tableStyle, thStyle, tdStyle } from "@/components/ui/tableStyles";
import { translate } from "@/lib/i18n/dictionaries";
import type { AppLocale } from "@/lib/i18n/locales";
import { getServerLocale } from "@/lib/i18n/server";
import {
  getExecutiveReportSectionTitle,
  translateCockpitMetrics,
  translateImpact,
  translateRiskCategory,
  translateStatus,
} from "@/lib/reporting/executiveReportTranslations";

type ExportPageProps = {
  searchParams?: Promise<{
    projectId?: string;
    reportingPackId?: string;
  }>;
};

type ProjectRisk = ExecutiveReportRisk;
type ProjectDecision = ExecutiveReportDecision;

const PDF_NARRATIVE_MAX_VISUAL_LINES = 30;
const PDF_NARRATIVE_APPROX_CHARS_PER_LINE = 118;

function getExposureStyle(exposure: number) {
  if (exposure >= 15) return { background: "#fecaca", color: "#991b1b" };
  if (exposure >= 7) return { background: "#fed7aa", color: "#9a3412" };
  return { background: "#bbf7d0", color: "#166534" };
}

function getImpactStyle(impact: string) {
  const styles: Record<string, { background: string; color: string }> = {
    LOW: { background: "#dcfce7", color: "#166534" },
    MEDIUM: { background: "#fef3c7", color: "#92400e" },
    HIGH: { background: "#fed7aa", color: "#9a3412" },
    CRITICAL: { background: "#fecaca", color: "#991b1b" },
  };

  return styles[impact] || { background: "#e2e8f0", color: "#334155" };
}

function getCockpitGroupLabel(locale: AppLocale, group: CockpitMetricGroup) {
  return translate(locale, group === "lifecycle" ? "metrics.lifecycle" : "metrics.attention");
}

function MetricCard({ metric }: { metric: CockpitMetric }) {
  const colors = cockpitMetricToneColors[metric.tone];

  return (
    <div
      className="pdf-metric-card"
      style={{ background: colors.background, borderColor: colors.border }}
    >
      <div className="pdf-metric-label" style={{ color: colors.label }}>
        {metric.label}
      </div>
      <div className="pdf-metric-value" style={{ color: colors.value }}>
        {metric.value}
      </div>
    </div>
  );
}

function PdfCockpitMetricGrid({
  metrics,
  locale,
}: {
  metrics: CockpitMetric[];
  locale: AppLocale;
}) {
  const orderedMetrics = sortCockpitMetrics(
    translateCockpitMetrics(metrics, (key) => translate(locale, key))
  );
  const lifecycleMetrics = orderedMetrics.filter(
    (metric) => metric.group === "lifecycle"
  );
  const attentionMetrics = orderedMetrics.filter(
    (metric) => metric.group === "attention"
  );

  return (
    <div className="pdf-cockpit-grid">
      <PdfMetricGroup group="lifecycle" metrics={lifecycleMetrics} locale={locale} />
      {attentionMetrics.length > 0 && (
        <PdfMetricGroup group="attention" metrics={attentionMetrics} locale={locale} />
      )}
    </div>
  );
}

function PdfMetricGroup({
  group,
  metrics,
  locale,
}: {
  group: CockpitMetricGroup;
  metrics: CockpitMetric[];
  locale: AppLocale;
}) {
  if (metrics.length === 0) return null;

  return (
    <div className="pdf-metric-group">
      <div className="pdf-metric-group-label">
        {getCockpitGroupLabel(locale, group)}
      </div>
      <div className="pdf-metric-grid">
        {metrics.map((metric) => (
          <MetricCard key={metric.key} metric={metric} />
        ))}
      </div>
    </div>
  );
}

function ImpactChip({
  impact,
  label,
}: {
  impact: string;
  label: string;
}) {
  return (
    <span className="pdf-chip" style={getImpactStyle(impact)}>
      {label}
    </span>
  );
}

function LogoBlock({
  organization,
  enabled,
  align,
}: {
  organization: ExecutiveReportProject["issuerOrganization"];
  enabled: boolean;
  align: "left" | "right";
}) {
  const name = organization?.displayName || organization?.name || "";

  return (
    <div className={`cover-logo cover-logo-${align}`}>
      {enabled && organization?.logoUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={organization.logoUrl} alt={`${name} logo`} />
        </>
      ) : null}
    </div>
  );
}

function PdfPage({
  id,
  title,
  children,
  className = "",
}: {
  id?: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`pdf-page ${className}`}>
      {title && (
        <div style={sectionHeaderStyle}>
          <div style={sectionTitleStyle}>{title}</div>
        </div>
      )}
      {children}
    </section>
  );
}

function NarrativeBlock({ text }: { text?: string | null }) {
  if (!text) return null;

  return (
    <div className="pdf-narrative-wrap">
      <div className="pdf-narrative">{text}</div>
    </div>
  );
}

function NarrativePages({
  id,
  title,
  text,
}: {
  id: string;
  title: string;
  text?: string | null;
}) {
  const chunks = chunkNarrativeText(text, {
    maxVisualLines: PDF_NARRATIVE_MAX_VISUAL_LINES,
    approximateCharsPerLine: PDF_NARRATIVE_APPROX_CHARS_PER_LINE,
  });

  return (
    <>
      {chunks.map((chunk, index) => (
        <PdfPage
          id={index === 0 ? id : `${id}-${index + 1}`}
          key={`${id}-${index}`}
          title={title}
        >
          <NarrativeBlock text={chunk} />
        </PdfPage>
      ))}
    </>
  );
}

function DecisionAttentionTable({
  decisions,
  locale,
}: {
  decisions: ProjectDecision[];
  locale: AppLocale;
}) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  if (decisions.length === 0) {
    return (
      <div className="pdf-empty">
        {translate(locale, "report.noExecutiveDecisionAttentionItems")}
      </div>
    );
  }

  return (
    <table className="pdf-attention-table" style={tableStyle}>
      <thead>
        <tr>
          <th style={thStyle}>{translate(locale, "labels.title")}</th>
          <th style={thStyle}>{translate(locale, "labels.recommendation")}</th>
          <th style={thStyle}>{translate(locale, "labels.owner")}</th>
          <th style={thStyle}>{translate(locale, "labels.dueDate")}</th>
          <th style={thStyle}>{translate(locale, "labels.impact")}</th>
          <th style={thStyle}>{translate(locale, "labels.status")}</th>
          <th style={thStyle}>{translate(locale, "labels.esc")}</th>
        </tr>
      </thead>
      <tbody>
        {decisions.map((decision) => (
          <tr key={decision.id}>
            <td style={tdStyle}>{decision.title}</td>
            <td style={tdStyle}>{decision.recommendation || "-"}</td>
            <td style={tdStyle}>{decision.owner || "-"}</td>
            <td style={tdStyle}>{formatDate(decision.dueDate)}</td>
            <td style={tdStyle}>
              <ImpactChip impact={decision.impact} label={translateImpact(decision.impact, t)} />
            </td>
            <td style={tdStyle}>{translateStatus(decision.statusRef, locale, t)}</td>
            <td style={tdStyle}>{decision.escalated ? t("labels.yes") : ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RecentDecisionOutcomes({
  decisions,
  locale,
}: {
  decisions: ProjectDecision[];
  locale: AppLocale;
}) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  if (decisions.length === 0) {
    return (
      <div className="pdf-empty">
        {translate(locale, "report.noRecentDecisionOutcomes")}
      </div>
    );
  }

  return (
    <table style={tableStyle}>
      <thead>
        <tr>
          <th style={thStyle}>{translate(locale, "labels.title")}</th>
          <th style={thStyle}>{translate(locale, "labels.outcome")}</th>
          <th style={thStyle}>{translate(locale, "labels.decisionDate")}</th>
          <th style={thStyle}>{translate(locale, "labels.impact")}</th>
          <th style={thStyle}>{translate(locale, "labels.status")}</th>
        </tr>
      </thead>
      <tbody>
        {decisions.map((decision) => (
          <tr key={decision.id}>
            <td style={tdStyle}>{decision.title}</td>
            <td style={tdStyle}>{decision.decision || "-"}</td>
            <td style={tdStyle}>
              {formatDate(decision.decisionDate ?? decision.updatedAt)}
            </td>
            <td style={tdStyle}>
              <ImpactChip impact={decision.impact} label={translateImpact(decision.impact, t)} />
            </td>
            <td style={tdStyle}>{translateStatus(decision.statusRef, locale, t)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RiskAttentionTable({
  risks,
  locale,
}: {
  risks: ProjectRisk[];
  locale: AppLocale;
}) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  if (risks.length === 0) {
    return (
      <div className="pdf-empty success">
        {translate(locale, "report.noExecutiveRiskAttentionItems")}
      </div>
    );
  }

  return (
    <div className="pdf-risk-list">
      {risks.map((risk) => {
        const exposure = risk.exposure ?? risk.probability * risk.impact;

        return (
          <div className="pdf-risk-card" key={risk.id}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>{translate(locale, "labels.risk")}</th>
                  <th style={thStyle}>{translate(locale, "labels.category")}</th>
                  <th style={thStyle}>{translate(locale, "labels.exposure")}</th>
                  <th style={thStyle}>{translate(locale, "labels.owner")}</th>
                  <th style={thStyle}>{translate(locale, "labels.status")}</th>
                  <th style={thStyle}>{translate(locale, "labels.target")}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdStyle}>
                    <strong>{risk.title}</strong>
                  </td>
                  <td style={tdStyle}>{translateRiskCategory(risk.category, locale, t)}</td>
                  <td style={tdStyle}>
                    <span className="pdf-chip" style={getExposureStyle(exposure)}>
                      {exposure}
                    </span>
                  </td>
                  <td style={tdStyle}>{risk.owner?.fullName ?? "-"}</td>
                  <td style={tdStyle}>{translateStatus(risk.status, locale, t)}</td>
                  <td style={tdStyle}>{formatDate(risk.targetResolutionDate)}</td>
                </tr>
              </tbody>
            </table>

            {(risk.description || risk.trigger) && (
              <div className="pdf-risk-detail-grid">
                {risk.description && (
                  <div>
                    <strong>{translate(locale, "labels.description")}</strong>
                    <p>{risk.description}</p>
                  </div>
                )}
                {risk.trigger && (
                  <div>
                    <strong>{translate(locale, "labels.trigger")}</strong>
                    <p>{risk.trigger}</p>
                  </div>
                )}
              </div>
            )}

            <strong>{translate(locale, "sections.mitigationActions")}</strong>
            <table style={{ ...tableStyle, marginTop: "0.5rem" }}>
              <thead>
                <tr>
                  <th style={thStyle}>{translate(locale, "labels.action")}</th>
                  <th style={thStyle}>{translate(locale, "labels.owner")}</th>
                  <th style={thStyle}>{translate(locale, "labels.dueDate")}</th>
                  <th style={thStyle}>{translate(locale, "labels.status")}</th>
                  <th style={thStyle}>{translate(locale, "labels.evidenceComment")}</th>
                </tr>
              </thead>
              <tbody>
                {(risk.riskActions ?? []).map((action) => (
                  <tr key={action.id}>
                    <td style={tdStyle}>{action.description}</td>
                    <td style={tdStyle}>{action.owner?.fullName ?? "-"}</td>
                    <td style={tdStyle}>{formatDate(action.dueDate)}</td>
                    <td style={tdStyle}>{translateStatus(action.statusRef, locale, t)}</td>
                    <td style={tdStyle}>{action.evidence ?? "-"}</td>
                  </tr>
                ))}
                {(risk.riskActions ?? []).length === 0 && (
                  <tr>
                    <td style={tdStyle} colSpan={5}>
                      {translate(locale, "report.noMitigationActions")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

export default async function ExecutiveReportExportPage({
  searchParams,
}: ExportPageProps) {
  const locale = await getServerLocale();
  const params = await searchParams;

  const projects = await getExecutiveReportProjectOptions();
  const riskReviewTypeHints = (await getExecutiveRiskReviewTypeOptions()).map(
    (reviewType) => reviewType.name
  );

  const selectedProjectId = getSelectedExecutiveProjectId({
    projectId: params?.projectId,
    projects,
  });

  const project = selectedProjectId
    ? await getExecutiveReportProject(selectedProjectId)
    : null;

  if (!project) {
    return <main>No project data available for export.</main>;
  }

  const reportingPack = getSelectedReportingPack({
    project,
    reportingPackId: params?.reportingPackId,
    selectedProjectId,
  });

  const {
    decisions,
    executiveDecisionAttention,
    recentDecisionOutcomes,
    attentionRisks,
    riskLifecycleRows,
    managementReviewRisks,
    projectWorkstreams: allProjectWorkstreams,
    projectEvents: allProjectEvents,
    decisionCockpitMetrics,
    riskCockpitMetrics,
    workstreamCockpitMetrics,
    milestoneCockpitMetrics,
    sections: reportSections,
  } = buildExecutiveReportViewModel({
    project,
    reportingPack,
    pdfMode: true,
  });
  const riskLifecycleLabels = buildExecutiveRiskLifecycleLabels((key) =>
    translate(locale, key)
  );
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  return (
    <main className="executive-report-export">
      <style>{`
        @page {
          size: A4 landscape;
          margin: 0;
        }

        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        body {
          margin: 0;
          background: #f8fafc;
          color: #0f172a;
          font-family: Arial, Helvetica, sans-serif;
        }

        body > nav {
          display: none !important;
        }

        .executive-report-export {
          max-width: 1120px;
          margin: 0 auto;
          padding: 24px;
        }

        .toolbar {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 16px;
        }

        button {
          border: 1px solid #cbd5e1;
          background: #ffffff;
          border-radius: 6px;
          padding: 8px 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .pdf-page {
          break-after: page;
          page-break-after: always;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          margin-bottom: 18px;
          min-height: 182mm;
          padding: 18px;
        }

        .pdf-page:last-child {
          break-after: auto;
          page-break-after: auto;
        }

        .cover-page {
          display: grid;
          grid-template-rows: auto 1fr auto;
          border-top: 8px solid #2563eb;
          min-height: 182mm;
        }

        .cover-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          min-height: 56px;
        }

        .cover-logo {
          width: 180px;
          min-height: 56px;
          display: flex;
          align-items: center;
        }

        .cover-logo-right {
          justify-content: flex-end;
        }

        .cover-logo img {
          max-width: 180px;
          max-height: 56px;
          object-fit: contain;
        }

        .cover-logo-placeholder {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          color: #64748b;
          font-size: 0.76rem;
          font-weight: 700;
          padding: 0.5rem;
          text-align: center;
          width: 100%;
        }

        .cover-title {
          align-self: center;
          text-align: center;
        }

        .cover-title h1 {
          font-size: 2.2rem;
          line-height: 1.1;
          margin: 0 0 0.75rem;
        }

        .cover-title .subtitle {
          color: #475569;
          font-size: 1.15rem;
          font-weight: 700;
        }

        .cover-title .code {
          display: none;
        }

        .cover-bottom {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1.25rem;
          padding-top: 0.9rem;
          border-top: 1px solid #e2e8f0;
        }

        .pdf-metric-card,
        .index-item,
        .pdf-empty,
        .pdf-risk-card,
        .pdf-narrative {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }

        .cover-meta {
          padding: 0;
        }

        .cover-meta-label,
        .pdf-metric-label {
          color: #475569;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .cover-meta-value,
        .pdf-metric-value {
          color: #111827;
          font-size: 1rem;
          font-weight: 700;
          margin-top: 0.25rem;
        }

        .index-list {
          display: grid;
          gap: 0.45rem;
          margin: 0;
          padding: 0;
        }

        .index-item {
          align-items: center;
          background: #f8fafc;
          color: #334155;
          display: flex;
          font-size: 0.85rem;
          font-weight: 600;
          gap: 0.65rem;
          padding: 0.5rem 0.65rem;
        }

        .index-number {
          align-items: center;
          background: #f1f5f9;
          border-radius: 999px;
          color: #475569;
          display: inline-flex;
          font-size: 0.72rem;
          font-weight: 800;
          height: 1.45rem;
          justify-content: center;
          width: 1.45rem;
        }

        .pdf-narrative-wrap {
          align-items: center;
          display: flex;
          min-height: 145mm;
        }

        .pdf-narrative {
          background: #f8fafc;
          color: #111827;
          font-size: 0.86rem;
          line-height: 1.5;
          padding: 0.8rem;
          white-space: pre-wrap;
          width: 100%;
        }

        .pdf-cockpit-grid {
          align-items: start;
          display: grid;
          gap: 0.45rem;
          grid-template-columns: minmax(0, 1.35fr) minmax(150px, 0.75fr);
          margin-bottom: 0.75rem;
          --pdf-cockpit-card-width: 72px;
        }

        .pdf-metric-group {
          min-width: 0;
        }

        .pdf-metric-group-label {
          color: #64748b;
          font-size: 0.62rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          margin-bottom: 0.28rem;
          text-transform: uppercase;
        }

        .pdf-metric-grid {
          display: grid;
          gap: 0.28rem;
          grid-template-columns: repeat(
            auto-fill,
            minmax(var(--pdf-cockpit-card-width), var(--pdf-cockpit-card-width))
          );
        }

        .pdf-metric-card {
          align-items: center;
          display: flex;
          gap: 0.25rem;
          justify-content: space-between;
          min-height: 28px;
          padding: 0.26rem 0.32rem;
        }

        .pdf-metric-label {
          line-height: 1.1;
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .pdf-metric-value {
          flex: 0 0 auto;
          line-height: 1;
          margin-left: 0.2rem;
          white-space: nowrap;
        }

        .pdf-chip {
          border-radius: 999px;
          display: inline-block;
          font-size: 0.72rem;
          font-weight: 700;
          min-width: 32px;
          padding: 0.18rem 0.5rem;
          text-align: center;
          white-space: nowrap;
        }

        .pdf-empty {
          background: #f8fafc;
          color: #475569;
          font-size: 0.82rem;
          font-weight: 600;
          padding: 0.75rem;
        }

        .pdf-empty.success {
          background: #dcfce7;
          color: #166534;
        }

        .pdf-risk-list {
          display: grid;
          gap: 0.75rem;
        }

        .pdf-attention-title {
          color: #334155;
          font-size: 0.8rem;
          font-weight: 700;
          margin: 0.8rem 0 0.35rem;
        }

        .pdf-section-description {
          color: #475569;
          font-size: 0.78rem;
          line-height: 1.35;
          margin: -0.15rem 0 0.55rem;
        }

        .pdf-risk-card {
          background: #eff6ff;
          break-inside: avoid;
          page-break-inside: avoid;
          padding: 0.75rem;
        }

        .pdf-risk-detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
          margin: 0.75rem 0;
        }

        .pdf-risk-detail-grid p {
          margin: 0.25rem 0 0;
          white-space: pre-wrap;
        }

        .project-timeline-page {
          padding: 12px;
        }

        .risk-lifecycle-page {
          background: #f8fafc;
        }

        .risk-review-page {
          background: #fffbeb;
        }

        .risk-lifecycle-page table,
        .risk-review-page table {
          background: #ffffff;
        }

        .project-timeline-page .section-panel {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          break-inside: avoid;
          margin-top: 0.5rem;
          padding: 0.65rem;
        }

        .project-timeline-page table {
          margin-top: 0.5rem !important;
        }

        .project-timeline-page,
        .project-timeline-page *,
        .pdf-metric-card,
        .pdf-chip,
        .pdf-risk-card,
        .pdf-empty,
        .cover-meta,
        .index-item,
        .pdf-narrative {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        .project-timeline-page th,
        .project-timeline-page td {
          font-size: 0.62rem !important;
          padding: 4px 5px !important;
        }

        .project-timeline-page button {
          display: none !important;
        }

        table {
          width: 100%;
        }

        @media print {
          body {
            background: #ffffff;
          }

          .executive-report-export {
            max-width: none;
            padding: 0;
          }

          .toolbar {
            display: none;
          }

          .pdf-page {
            border: 0;
            border-radius: 0;
            margin: 0;
            min-height: 210mm;
            padding: 12mm;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .cover-page {
            height: 210mm;
          }

          button {
            display: none !important;
          }
        }
      `}</style>

      <div className="toolbar">
        <PrintButton />
      </div>

      <section className="pdf-page cover-page">
        <div className="cover-top">
          <LogoBlock
            organization={project.issuerOrganization}
            enabled={true}
            align="left"
          />
          <LogoBlock
            organization={project.clientOrganization}
            enabled={true}
            align="right"
          />
        </div>

        <div className="cover-title">
          <h1>{project.name}</h1>
          <div className="subtitle">{t("report.executiveReport")}</div>
        </div>

        <div className="cover-bottom">
          <div className="cover-meta">
            <div className="cover-meta-label">{t("labels.projectManager")}</div>
            <div className="cover-meta-value">
              {project.projectManagerContact?.name ??
                "-"}
            </div>
          </div>
          <div className="cover-meta">
            <div className="cover-meta-label">{t("labels.version")}</div>
            <div className="cover-meta-value">
              {reportingPack ? `v${reportingPack.version}` : "-"}
            </div>
          </div>
          <div className="cover-meta">
            <div className="cover-meta-label">{t("labels.reportingDate")}</div>
            <div className="cover-meta-value">
              {formatMonthYear(reportingPack?.reportingDate)}
            </div>
          </div>
        </div>
      </section>

      <PdfPage title={translate(locale, "report.index")}>
        <ol className="index-list">
          {reportSections.map((section, index) => (
            <li className="index-item" key={section.id}>
              <span className="index-number">{index + 1}</span>
              {getExecutiveReportSectionTitle(section, t)}
            </li>
          ))}
        </ol>
      </PdfPage>

      {reportingPack?.executiveSummary && (
        <NarrativePages
          id="executive-summary"
          title={translate(locale, "report.executiveSummary")}
          text={reportingPack.executiveSummary}
        />
      )}

      {reportingPack?.achievements && (
        <NarrativePages
          id="achievements"
          title={translate(locale, "report.achievements")}
          text={reportingPack.achievements}
        />
      )}

      {reportingPack?.issues && (
        <NarrativePages
          id="issues"
          title={translate(locale, "report.issuesConcerns")}
          text={reportingPack.issues}
        />
      )}

      {decisions.length > 0 && (
        <PdfPage
          id="decision-cockpit"
          title={getExecutiveReportSectionTitle(
            reportSections.find((section) => section.id === "decision-cockpit") ?? {
              id: "decision-cockpit",
              title: "",
            },
            t
          )}
        >
          <PdfCockpitMetricGrid metrics={decisionCockpitMetrics} locale={locale} />
          <div className="pdf-attention-title">
            {translate(locale, "report.executiveDecisionAttention")}
          </div>
          <DecisionAttentionTable
            decisions={executiveDecisionAttention}
            locale={locale}
          />
          <div className="pdf-attention-title">
            {translate(locale, "report.recentDecisionOutcomes")}
          </div>
          <RecentDecisionOutcomes
            decisions={recentDecisionOutcomes}
            locale={locale}
          />
        </PdfPage>
      )}

      <PdfPage
        id="risk-cockpit"
        title={getExecutiveReportSectionTitle(
          reportSections.find((section) => section.id === "risk-cockpit") ?? {
            id: "risk-cockpit",
            title: "",
          },
          t
        )}
      >
        <div className="pdf-section-description">
          {translate(locale, "report.riskSectionDescription")}
        </div>
        <PdfCockpitMetricGrid metrics={riskCockpitMetrics} locale={locale} />
        <div className="pdf-attention-title">
          {translate(locale, "report.riskAttention")}
        </div>
        <RiskAttentionTable risks={attentionRisks} locale={locale} />
      </PdfPage>

      {riskLifecycleRows.length > 0 && (
        <PdfPage
          id="risk-lifecycle-summary"
          title={getExecutiveReportSectionTitle(
            reportSections.find((section) => section.id === "risk-lifecycle-summary") ?? {
              id: "risk-lifecycle-summary",
              title: "",
            },
            t
          )}
          className="risk-lifecycle-page"
        >
          <ExecutiveRiskLifecycleSummary
            rows={riskLifecycleRows}
            labels={riskLifecycleLabels}
          />
        </PdfPage>
      )}

      {managementReviewRisks.map(({ risk }, index) => (
        <PdfPage
          id={index === 0 ? "risk-management-review" : `risk-review-${risk.id}`}
          key={risk.id}
          title={`${getExecutiveReportSectionTitle(
            reportSections.find((section) => section.id === "risk-management-review") ?? {
              id: "risk-management-review",
              title: "",
            },
            t
          )}: ${risk.riskCode ?? "Risk"} ${risk.title}`}
          className="risk-review-page"
        >
          {index === 0 && <span id={`risk-review-${risk.id}`} />}
          <ExecutiveRiskReviewDetail
            risk={risk}
            reviewTypeHints={riskReviewTypeHints}
            labels={riskLifecycleLabels}
          />
        </PdfPage>
      ))}

      {allProjectWorkstreams.length > 0 && (
        <PdfPage
          id="workstreams"
          title={getExecutiveReportSectionTitle(
            reportSections.find((section) => section.id === "workstreams") ?? {
              id: "workstreams",
              title: "",
            },
            t
          )}
          className="project-timeline-page"
        >
          <PdfCockpitMetricGrid metrics={workstreamCockpitMetrics} locale={locale} />
        </PdfPage>
      )}

      {allProjectEvents.length > 0 && (
        <PdfPage
          id="milestones"
          title={getExecutiveReportSectionTitle(
            reportSections.find((section) => section.id === "milestones") ?? {
              id: "milestones",
              title: "",
            },
            t
          )}
          className="project-timeline-page"
        >
          <PdfCockpitMetricGrid metrics={milestoneCockpitMetrics} locale={locale} />
        </PdfPage>
      )}

      {(allProjectWorkstreams.length > 0 || allProjectEvents.length > 0) && (
        <PdfPage
          id="gantt-detail"
          title={getExecutiveReportSectionTitle(
            reportSections.find((section) => section.id === "gantt-detail") ?? {
              id: "gantt-detail",
              title: "",
            },
            t
          )}
          className="project-timeline-page"
        >
          <ExecutiveTimelineGantt
            projectWorkstreams={allProjectWorkstreams}
            projectEvents={allProjectEvents}
          />
        </PdfPage>
      )}

      {reportingPack?.nextSteps && (
        <NarrativePages
          id="next-steps"
          title={translate(locale, "report.nextSteps")}
          text={reportingPack.nextSteps}
        />
      )}

      {reportingPack?.managementAsk && (
        <NarrativePages
          id="management-ask"
          title={translate(locale, "report.managementAsk")}
          text={reportingPack.managementAsk}
        />
      )}

      {reportingPack?.conclusion && (
        <NarrativePages
          id="conclusion"
          title={translate(locale, "report.conclusion")}
          text={reportingPack.conclusion}
        />
      )}
    </main>
  );
}
