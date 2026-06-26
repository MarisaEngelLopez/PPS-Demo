import Link from "next/link";
import ExecutiveReportDashboard, {
  type ReportChapter,
} from "@/components/executive-report/ExecutiveReportDashboard";
import {
  getExecutiveReportProject,
  getExecutiveReportProjectOptions,
  getExecutiveRiskReviewTypeOptions,
  getSelectedExecutiveProjectId,
  getSelectedReportingPack,
} from "@/lib/domain/reporting/executiveReportQueries";
import {
  pageStyle,
  h1Style,
  sectionPanelStyle,
  labelStyle,
  compactInputStyle,
} from "@/components/ui/layoutStyles";
import { translate } from "@/lib/i18n/dictionaries";
import { getServerLocale } from "@/lib/i18n/server";

export default async function ExecutiveReportPage({
  searchParams,
}: {
  searchParams?: Promise<{
    projectId?: string;
    reportingPackId?: string;
    chapter?: string;
  }>;
}) {
  const locale = await getServerLocale();
  const resolvedSearchParams = await searchParams;

  const projects = await getExecutiveReportProjectOptions();
  const riskReviewTypeHints = (await getExecutiveRiskReviewTypeOptions()).map(
    (reviewType) => reviewType.name
  );

  const selectedProjectId = getSelectedExecutiveProjectId({
    projectId: resolvedSearchParams?.projectId,
    projects,
  });

  const project = selectedProjectId
    ? await getExecutiveReportProject(selectedProjectId)
    : null;

  const reportingPacks = project?.reportingPacks ?? [];

  const selectedReportingPack = getSelectedReportingPack({
    project,
    reportingPackId: resolvedSearchParams?.reportingPackId,
    selectedProjectId,
  });
  const chapterValues: ReportChapter[] = [
    "overview",
    "decisions",
    "risks",
    "workstreams",
    "gantt",
    "narrative",
  ];
  const activeChapter = chapterValues.includes(
    resolvedSearchParams?.chapter as ReportChapter
  )
    ? (resolvedSearchParams?.chapter as ReportChapter)
    : "overview";

  return (
    <main style={pageStyle}>
      <h1 style={h1Style}>{translate(locale, "report.executiveReport")}</h1>

  <form
  method="get"
  style={{
    ...sectionPanelStyle,
    display: "grid",
    gridTemplateColumns: "120px 1fr 140px 1fr auto",
    gap: "0.5rem 0.75rem",
    alignItems: "center",
    marginBottom: "1rem",
    background: "#f8fafc",
  }}
>
  <div style={labelStyle}>{translate(locale, "labels.project")}</div>
 <select
  name="projectId"
  defaultValue={selectedProjectId}
  style={compactInputStyle}
>
    {projects.map((project) => (
      <option key={project.id} value={project.id}>
        {project.projectCode} - {project.name}
      </option>
    ))}
  </select>

  <div style={labelStyle}>Reporting Pack</div>
  <select
    name="reportingPackId"
    defaultValue={selectedReportingPack?.id ?? ""}
    style={compactInputStyle}
  >
    <option value="">Latest / none</option>
    {reportingPacks.map((pack) => (
      <option key={pack.id} value={pack.id}>
        v{pack.version} - {pack.title}
      </option>
    ))}
  </select>

  <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
    <button
      type="submit"
      style={{
        padding: "0.35rem 0.65rem",
        borderRadius: "6px",
        border: "1px solid #cbd5e1",
        background: "#ffffff",
        cursor: "pointer",
        fontSize: "0.8rem",
      }}
    >
      Load
    </button>

    {project && (
      <>
        <Link
          href={`/executive-report/export?projectId=${selectedProjectId}${
            selectedReportingPack?.id
              ? `&reportingPackId=${selectedReportingPack.id}`
              : ""
          }`}
          style={{
            padding: "0.35rem 0.65rem",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
            background: "#ffffff",
            color: "#111827",
            textDecoration: "none",
            fontSize: "0.8rem",
          }}
        >
          PDF Preview
        </Link>

        <Link
          href={`/executive-report/pdf?projectId=${selectedProjectId}${
            selectedReportingPack?.id
              ? `&reportingPackId=${selectedReportingPack.id}`
              : ""
          }`}
          style={{
            padding: "0.35rem 0.65rem",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
            background: "#ffffff",
            color: "#111827",
            textDecoration: "none",
            fontSize: "0.8rem",
          }}
        >
          PDF
        </Link>

        <Link
          href={`/executive-report/data?projectId=${selectedProjectId}${
            selectedReportingPack?.id
              ? `&reportingPackId=${selectedReportingPack.id}`
              : ""
          }`}
          style={{
            padding: "0.35rem 0.65rem",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
            background: "#ffffff",
            color: "#111827",
            textDecoration: "none",
            fontSize: "0.8rem",
          }}
        >
          Data
        </Link>

        <Link
          href={`/executive-report/pptx?projectId=${selectedProjectId}${
            selectedReportingPack?.id
              ? `&reportingPackId=${selectedReportingPack.id}`
              : ""
          }`}
          style={{
            padding: "0.35rem 0.65rem",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
            background: "#ffffff",
            color: "#111827",
            textDecoration: "none",
            fontSize: "0.8rem",
          }}
        >
          PPT
        </Link>
      </>
    )}
  </div>
</form>

      {!project && (
        <div style={sectionPanelStyle}>
          No active project found.
        </div>
      )}

      {project && (
        <ExecutiveReportDashboard
          project={project}
          reportingPack={selectedReportingPack}
          riskReviewTypeHints={riskReviewTypeHints}
          activeChapter={activeChapter}
        />
      )}
    </main>
  );
}
