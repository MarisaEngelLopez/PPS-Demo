import {
  getExecutiveReportProject,
  getExecutiveReportProjectOptions,
  getExecutiveRiskReviewTypeOptions,
  getSelectedExecutiveProjectId,
  getSelectedReportingPack,
} from "@/lib/domain/reporting/executiveReportQueries";
import { getServerLocale } from "@/lib/i18n/server";
import { createExecutiveReportPptx } from "@/lib/reporting/executiveReportPptx";

export const runtime = "nodejs";

function filenamePart(value: string) {
  return value
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function GET(request: Request) {
  const locale = await getServerLocale();
  const { searchParams } = new URL(request.url);
  const projects = await getExecutiveReportProjectOptions();
  const selectedProjectId = getSelectedExecutiveProjectId({
    projectId: searchParams.get("projectId") ?? undefined,
    projects,
  });

  const project = selectedProjectId
    ? await getExecutiveReportProject(selectedProjectId)
    : null;

  if (!project) {
    return new Response("No project data available for PPT export.", {
      status: 404,
    });
  }

  const reportingPack = getSelectedReportingPack({
    project,
    reportingPackId: searchParams.get("reportingPackId") ?? undefined,
    selectedProjectId,
  });
  const briefingOnly = searchParams.get("view") === "briefing";

  const pptx = await createExecutiveReportPptx({
    project,
    reportingPack,
    locale,
    riskReviewTypeHints: (await getExecutiveRiskReviewTypeOptions()).map(
      (reviewType) => reviewType.name
    ),
    briefingOnly,
  });

  const version = reportingPack ? `v${reportingPack.version}` : "latest";
  const filename = `${filenamePart(project.projectCode)}-${briefingOnly ? "executive-briefing" : "executive-report"}-${version}.pptx`;

  return new Response(pptx, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pptx.byteLength),
    },
  });
}
