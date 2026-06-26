import { NextResponse } from "next/server";
import { getServerLocale } from "@/lib/i18n/server";
import { getExecutiveReportData } from "@/lib/reporting/executiveReportData";

export async function GET(request: Request) {
  const locale = await getServerLocale();
  const { searchParams } = new URL(request.url);

  const report = await getExecutiveReportData({
    locale,
    projectId: searchParams.get("projectId") ?? undefined,
    reportingPackId: searchParams.get("reportingPackId") ?? undefined,
  });

  return NextResponse.json(report);
}
