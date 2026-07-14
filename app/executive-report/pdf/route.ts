import { chromium } from "playwright";

import {
  getExecutiveReportProject,
  getExecutiveReportProjectOptions,
  getSelectedExecutiveProjectId,
  getSelectedReportingPack,
} from "@/lib/domain/reporting/executiveReportQueries";

export const runtime = "nodejs";

function filenamePart(value: string) {
  return value
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const projects = await getExecutiveReportProjectOptions();
  const selectedProjectId = getSelectedExecutiveProjectId({
    projectId: searchParams.get("projectId") ?? undefined,
    projects,
  });

  const project = selectedProjectId
    ? await getExecutiveReportProject(selectedProjectId)
    : null;

  if (!project) {
    return new Response("No project data available for PDF export.", {
      status: 404,
    });
  }

  const reportingPack = getSelectedReportingPack({
    project,
    reportingPackId: searchParams.get("reportingPackId") ?? undefined,
    selectedProjectId,
  });
  const briefingOnly = searchParams.get("view") === "briefing";

  const exportUrl = new URL("/executive-report/export", origin);
  exportUrl.searchParams.set("projectId", selectedProjectId);

  if (reportingPack?.id) {
    exportUrl.searchParams.set("reportingPackId", reportingPack.id);
  }
  if (briefingOnly) exportUrl.searchParams.set("view", "briefing");

  const browser = await chromium.launch({ headless: true });
  const cookieHeader = request.headers.get("cookie") ?? "";
  const context = await browser.newContext({
    extraHTTPHeaders: cookieHeader ? { cookie: cookieHeader } : undefined,
    viewport: { width: 1600, height: 1000 },
  });

  try {
    const page = await context.newPage();

    await page.goto(exportUrl.toString(), { waitUntil: "networkidle" });
    await page.emulateMedia({ media: "print" });

    const pdf = await page.pdf({
      displayHeaderFooter: false,
      format: "A4",
      landscape: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      preferCSSPageSize: true,
      printBackground: true,
    });

    const version = reportingPack ? `v${reportingPack.version}` : "latest";
    const filename = `${filenamePart(project.projectCode)}-${briefingOnly ? "executive-briefing" : "executive-report"}-${version}.pdf`;

    const pdfBody = new Blob([new Uint8Array(pdf)], {
      type: "application/pdf",
    });

    return new Response(pdfBody, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdf.byteLength),
      },
    });
  } finally {
    await context.close();
    await browser.close();
  }
}
