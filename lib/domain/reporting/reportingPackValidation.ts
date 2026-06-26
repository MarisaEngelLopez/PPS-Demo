import {
  isReportingPackStatus,
  normalizeReportingPackStatus,
} from "@/lib/domain/reporting/reportingPackRules";
import type { ReportingPackStatus } from "@/lib/domain/reporting/reportingPackTypes";

export type ReportingPackInput = {
  title: string;
  status: ReportingPackStatus;
  reportingDate: Date;
  reportingPeriod: string | null;
  reportIndex: string | null;
  executiveSummary: string | null;
  achievements: string | null;
  issues: string | null;
  nextSteps: string | null;
  managementAsk: string | null;
  conclusion: string | null;
};

export function textOrNull(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  return text === "" ? null : text;
}

export function dateOrToday(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  return text ? new Date(text) : new Date();
}

export function parseReportingPackInput(formData: FormData): ReportingPackInput {
  return {
    title: String(formData.get("title") || "").trim(),
    reportingDate: dateOrToday(formData.get("reportingDate")),
    reportingPeriod: textOrNull(formData.get("reportingPeriod")),
    status: normalizeReportingPackStatus(String(formData.get("status") || "DRAFT")),
    reportIndex: textOrNull(formData.get("reportIndex")),
    executiveSummary: textOrNull(formData.get("executiveSummary")),
    achievements: textOrNull(formData.get("achievements")),
    issues: textOrNull(formData.get("issues")),
    nextSteps: textOrNull(formData.get("nextSteps")),
    managementAsk: textOrNull(formData.get("managementAsk")),
    conclusion: textOrNull(formData.get("conclusion")),
  };
}

export function validateReportingPackInput(input: ReportingPackInput) {
  if (!input.title) {
    return {
      ok: false as const,
      message: "Reporting pack not updated: title is required.",
    };
  }

  if (!isReportingPackStatus(input.status)) {
    return {
      ok: false as const,
      message: "Reporting pack not updated: status is invalid.",
    };
  }

  return { ok: true as const };
}
