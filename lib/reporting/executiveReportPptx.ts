import fs from "node:fs";
import path from "node:path";
import pptxgen from "pptxgenjs";
import {
  formatReportDate,
  formatReportMonthYear,
} from "@/lib/domain/reporting/executiveReportRules";
import {
  buildExecutiveGanttModel,
  type ExecutiveGanttBar,
  type ExecutiveGanttModel,
  type ExecutiveGanttRow,
} from "@/lib/domain/reporting/executiveGanttModel";
import { EXECUTIVE_GANTT_OUTPUT_CONTRACT } from "@/lib/domain/reporting/executiveGanttOutputContract";
import { chunkNarrativeText } from "@/lib/domain/reporting/narrativePagination";
import {
  formatNarrativePresentationText,
  getNarrativePresentationItems,
  type NarrativePresentationMode,
} from "@/lib/domain/reporting/narrativePresentation";
import { buildExecutiveReportViewModel } from "@/lib/domain/reporting/executiveReportViewModel";
import { buildExecutiveBriefingModel } from "@/lib/domain/reporting/executiveBriefingModel";
import { findManagedNarrativeAsset } from "@/lib/domain/narrative/narrativeRepository";
import { resolveNarrativePresentationMode } from "@/lib/domain/narrative/narrativeDocument";
import {
  cockpitMetricToneColors,
  sortCockpitMetrics,
  type CockpitMetric,
  type CockpitMetricGroup,
} from "@/lib/domain/reporting/cockpitMetrics";
import { translate } from "@/lib/i18n/dictionaries";
import type { AppLocale } from "@/lib/i18n/locales";
import {
  getExecutiveReportSectionTitle,
  translateAssessmentType,
  translateCockpitMetrics,
  translateEvidenceType,
  translateImpact,
  translateLifecycleStage,
  translateRiskCategory,
  translateRiskReviewOutcome,
  translateRiskReviewType,
  translateStatus,
} from "@/lib/reporting/executiveReportTranslations";
import type {
  ExecutiveReportProject,
  ExecutiveReportReportingPack,
  ExecutiveReportRisk,
} from "@/lib/domain/reporting/executiveReportTypes";

const COLORS = {
  ink: "0F172A",
  muted: "64748B",
  panel: "F8FAFC",
  border: "E2E8F0",
  blue: "2563EB",
  green: "DCFCE7",
  amber: "FDE68A",
  orange: "FED7AA",
  red: "FECACA",
  indigo: "E0E7FF",
};

const SLIDE = {
  width: 13.333,
  height: 7.5,
  marginX: 0.45,
  titleY: 0.28,
};

const PPT_NARRATIVE_MAX_VISUAL_LINES = 21;
const PPT_NARRATIVE_APPROX_CHARS_PER_LINE = 96;

function safeText(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function truncate(value: string | null | undefined, max = 160) {
  const text = safeText(value);
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

type PptxImageSource = { path: string } | { data: string };

async function getImageSource(logoUrl?: string | null): Promise<PptxImageSource | null> {
  if (!logoUrl) {
    return null;
  }

  if (logoUrl.startsWith("data:")) {
    return { data: logoUrl };
  }

  if (/^https?:\/\//i.test(logoUrl)) {
    try {
      const response = await fetch(logoUrl);
      if (!response.ok) return null;
      const contentType = response.headers.get("content-type") ?? "image/png";
      const bytes = Buffer.from(await response.arrayBuffer());
      return { data: `data:${contentType};base64,${bytes.toString("base64")}` };
    } catch {
      return null;
    }
  }

  const candidate = logoUrl.startsWith("/")
    ? path.join(process.cwd(), "public", logoUrl.slice(1))
    : path.join(process.cwd(), "public", logoUrl);

  return fs.existsSync(candidate) ? { path: candidate } : null;
}

function addTitle(slide: pptxgen.Slide, title: string, kicker = "EXECUTIVE REPORT") {
  slide.addText(kicker, {
    x: SLIDE.marginX,
    y: 0.2,
    w: 2.4,
    h: 0.22,
    fontSize: 8,
    bold: true,
    color: COLORS.blue,
    margin: 0,
    breakLine: false,
  });
  slide.addText(title, {
    x: SLIDE.marginX,
    y: SLIDE.titleY + 0.2,
    w: 12,
    h: 0.45,
    fontSize: 24,
    bold: true,
    color: COLORS.ink,
    margin: 0,
    fit: "shrink",
  });
  slide.addShape("line", {
    x: SLIDE.marginX,
    y: 1.0,
    w: 12.4,
    h: 0,
    line: { color: COLORS.border, width: 1 },
  });
}

function addFooter(slide: pptxgen.Slide, project: ExecutiveReportProject, page: number) {
  slide.addText(`${project.projectCode} | ${project.name}`, {
    x: SLIDE.marginX,
    y: 7.12,
    w: 8,
    h: 0.2,
    fontSize: 8,
    color: COLORS.muted,
    margin: 0,
    fit: "shrink",
  });
  slide.addText(String(page), {
    x: 12.4,
    y: 7.12,
    w: 0.45,
    h: 0.2,
    fontSize: 8,
    color: COLORS.muted,
    margin: 0,
    align: "right",
  });
}

function addMetric(
  slide: pptxgen.Slide,
  label: string,
  value: string | number,
  x: number,
  y: number,
  w: number,
  fill = COLORS.panel
) {
  slide.addShape("roundRect", {
    x,
    y,
    w,
    h: 0.52,
    rectRadius: 0.04,
    fill: { color: fill },
    line: { color: COLORS.border, width: 0.75 },
  });
  slide.addText(label, {
    x: x + 0.12,
    y: y + 0.1,
    w: w * 0.62,
    h: 0.18,
    fontSize: 8,
    color: COLORS.muted,
    bold: true,
    margin: 0,
    fit: "shrink",
  });
  slide.addText(String(value), {
    x: x + w * 0.68,
    y: y + 0.08,
    w: w * 0.25,
    h: 0.24,
    fontSize: 14,
    color: COLORS.ink,
    bold: true,
    margin: 0,
    align: "right",
    fit: "shrink",
  });
}

function pptColor(hex: string) {
  return hex.replace("#", "").toUpperCase();
}

function addCockpitMetrics(
  slide: pptxgen.Slide,
  metrics: CockpitMetric[],
  y: number,
  locale: AppLocale
) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const orderedMetrics = sortCockpitMetrics(translateCockpitMetrics(metrics, t));
  const lifecycleMetrics = orderedMetrics.filter(
    (metric) => metric.group === "lifecycle"
  );
  const attentionMetrics = orderedMetrics.filter(
    (metric) => metric.group === "attention"
  );

  const addGroup = (
    group: CockpitMetricGroup,
    groupMetrics: CockpitMetric[],
    x: number
  ) => {
    if (groupMetrics.length === 0) return;

    const gap = 0.1;
    const cardWidth = 1.2;
    const width = groupMetrics.length * cardWidth + (groupMetrics.length - 1) * gap;

    slide.addText(
      translate(locale, group === "lifecycle" ? "metrics.lifecycle" : "metrics.attention").toUpperCase(),
      {
      x,
      y,
      w: width,
      h: 0.14,
      fontSize: 6.5,
      bold: true,
      color: COLORS.muted,
      margin: 0,
      breakLine: false,
      }
    );

    groupMetrics.forEach((metric, index) => {
      const colors = cockpitMetricToneColors[metric.tone];
      addMetric(
        slide,
        metric.label,
        metric.value,
        x + index * (cardWidth + gap),
        y + 0.22,
        cardWidth,
        pptColor(colors.background)
      );
    });
  };

  addGroup("lifecycle", lifecycleMetrics, 0.55);
  addGroup("attention", attentionMetrics, 8.0);
}

function findReportSection(
  report: ReturnType<typeof buildExecutiveReportViewModel>,
  id: string
) {
  return report.sections.find((section) => section.id === id) ?? { id, title: id };
}

function addCoverMeta(
  slide: pptxgen.Slide,
  label: string,
  value: string,
  x: number,
  y: number,
  w: number
) {
  slide.addText(label, {
    x,
    y,
    w,
    h: 0.18,
    fontSize: 8,
    bold: true,
    color: COLORS.muted,
    margin: 0,
    align: "center",
    fit: "shrink",
  });
  slide.addText(value, {
    x,
    y: y + 0.28,
    w,
    h: 0.28,
    fontSize: 13,
    bold: true,
    color: COLORS.ink,
    margin: 0,
    align: "center",
    fit: "shrink",
  });
}

function addNarrativeSlide(
  pptx: pptxgen,
  project: ExecutiveReportProject,
  page: number,
  title: string,
  text?: string | null,
  kicker = "EXECUTIVE REPORT",
  mode: NarrativePresentationMode = "BULLETS"
) {
  const presentationText = formatNarrativePresentationText(text, mode)
    .replace(/^✓ /gmu, "✓   ")
    .replace(/^• /gmu, "•   ")
    .replace(/^\s+◦ /gmu, "      ◦   ");
  const chunks = chunkNarrativeText(presentationText, {
    maxVisualLines: PPT_NARRATIVE_MAX_VISUAL_LINES,
    approximateCharsPerLine: PPT_NARRATIVE_APPROX_CHARS_PER_LINE,
  });
  if (chunks.length === 0) return page;

  let nextPage = page;
  for (const chunk of chunks) {
    const slide = pptx.addSlide();
    slide.background = { color: "FFFFFF" };
    addTitle(slide, title, kicker);
    slide.addText(chunk, {
      x: mode === "CHECKPOINTS" ? 2.05 : 0.9,
      y: mode === "CHECKPOINTS" ? 1.75 : 1.35,
      w: mode === "CHECKPOINTS" ? 9.25 : 11.55,
      h: mode === "CHECKPOINTS" ? 3.9 : 4.95,
      fontSize: mode === "CHECKPOINTS" ? 18 : 13,
      color: COLORS.ink,
      valign: mode === "CHECKPOINTS" ? "middle" : "top",
      align: "left",
      breakLine: false,
      margin: 0.16,
      fill: mode === "CHECKPOINTS" ? undefined : { color: COLORS.panel },
      line: mode === "CHECKPOINTS" ? undefined : { color: COLORS.border, width: 1 },
      paraSpaceAfter: mode === "CHECKPOINTS" ? 8 : 5,
    });
    addFooter(slide, project, nextPage);
    nextPage += 1;
  }

  return nextPage;
}

function addTable(
  slide: pptxgen.Slide,
  rows: (string | number)[][],
  y: number,
  colW: number[],
  fontSize = 8
) {
  const tableRows: pptxgen.TableRow[] = rows.map((row, rowIndex) =>
    row.map((cell) => ({
      text: String(cell),
      options:
        rowIndex === 0
          ? { bold: true, fill: { color: "F1F5F9" }, color: COLORS.ink }
          : undefined,
    }))
  );

  slide.addTable(tableRows, {
    x: SLIDE.marginX,
    y,
    w: 12.4,
    border: { type: "solid", color: COLORS.border, pt: 0.5 },
    fontSize,
    color: COLORS.ink,
    margin: 0.05,
    colW,
    valign: "middle",
  });
}

function riskExposure(risk: ExecutiveReportRisk) {
  return risk.exposure ?? risk.probability * risk.impact;
}

function addRiskRow(
  slide: pptxgen.Slide,
  risk: ExecutiveReportRisk,
  y: number,
  locale: AppLocale,
  t: (key: Parameters<typeof translate>[1]) => string
) {
  slide.addShape("rect", {
    x: SLIDE.marginX,
    y,
    w: 12.4,
    h: 0.34,
    fill: { color: "F1F5F9" },
    line: { color: COLORS.border, width: 0.5 },
  });
  slide.addText(truncate(risk.title, 58), {
    x: 0.55,
    y: y + 0.08,
    w: 4.4,
    h: 0.12,
    fontSize: 7.5,
    bold: true,
    color: COLORS.ink,
    margin: 0,
    fit: "shrink",
  });
  slide.addText(translateRiskCategory(risk.category, locale, t), {
    x: 5.05,
    y: y + 0.08,
    w: 1.4,
    h: 0.12,
    fontSize: 7.5,
    color: COLORS.ink,
    margin: 0,
    fit: "shrink",
  });
  slide.addText(String(riskExposure(risk)), {
    x: 6.55,
    y: y + 0.08,
    w: 0.5,
    h: 0.12,
    fontSize: 7.5,
    bold: true,
    color: COLORS.ink,
    margin: 0,
  });
  slide.addText(risk.owner?.fullName ?? "-", {
    x: 7.35,
    y: y + 0.08,
    w: 1.55,
    h: 0.12,
    fontSize: 7.5,
    color: COLORS.ink,
    margin: 0,
    fit: "shrink",
  });
  slide.addText(translateStatus(risk.status, locale, t), {
    x: 9.05,
    y: y + 0.08,
    w: 1.5,
    h: 0.12,
    fontSize: 7.5,
    color: COLORS.ink,
    margin: 0,
    fit: "shrink",
  });
  slide.addText(formatReportDate(risk.targetResolutionDate), {
    x: 10.75,
    y: y + 0.08,
    w: 1.2,
    h: 0.12,
    fontSize: 7.5,
    color: COLORS.ink,
    margin: 0,
  });
}

function addRiskActionRows(
  slide: pptxgen.Slide,
  risk: ExecutiveReportRisk,
  y: number,
  locale: AppLocale,
  t: (key: Parameters<typeof translate>[1]) => string
) {
  const actions = risk.riskActions ?? [];
  slide.addShape("rect", {
    x: 0.62,
    y,
    w: 12.0,
    h: 0.26 + Math.max(actions.length, 1) * 0.3,
    fill: { color: "EFF6FF" },
    line: { color: "BFDBFE", width: 0.5 },
  });
  slide.addText(t("sections.mitigationActions"), {
    x: 0.75,
    y: y + 0.08,
    w: 2.4,
    h: 0.12,
    fontSize: 7.2,
    bold: true,
    color: COLORS.ink,
    margin: 0,
  });

  if (actions.length === 0) {
    slide.addText(t("report.noMitigationActions"), {
      x: 0.75,
      y: y + 0.34,
      w: 4,
      h: 0.12,
      fontSize: 7,
      color: COLORS.muted,
      margin: 0,
    });
    return 0.62;
  }

  actions.forEach((action, index) => {
    const rowY = y + 0.34 + index * 0.3;
    slide.addText(truncate(action.description, 92), {
      x: 0.75,
      y: rowY,
      w: 5.25,
      h: 0.12,
      fontSize: 6.8,
      color: COLORS.ink,
      margin: 0,
      fit: "shrink",
    });
    slide.addText(action.owner?.fullName ?? "-", {
      x: 6.15,
      y: rowY,
      w: 1.45,
      h: 0.12,
      fontSize: 6.8,
      color: COLORS.ink,
      margin: 0,
      fit: "shrink",
    });
    slide.addText(formatReportDate(action.dueDate), {
      x: 7.82,
      y: rowY,
      w: 0.95,
      h: 0.12,
      fontSize: 6.8,
      color: COLORS.ink,
      margin: 0,
    });
    slide.addText(translateStatus(action.statusRef, locale, t), {
      x: 9.0,
      y: rowY,
      w: 1.1,
      h: 0.12,
      fontSize: 6.8,
      color: COLORS.ink,
      margin: 0,
      fit: "shrink",
    });
    slide.addText(truncate(action.evidence, 42), {
      x: 10.25,
      y: rowY,
      w: 2.05,
      h: 0.12,
      fontSize: 6.8,
      color: COLORS.ink,
      margin: 0,
      fit: "shrink",
    });
  });

  return 0.26 + actions.length * 0.3;
}

function addRiskLifecycleSummarySlide(
  pptx: pptxgen,
  project: ExecutiveReportProject,
  page: number,
  report: ReturnType<typeof buildExecutiveReportViewModel>,
  locale: AppLocale,
  t: (key: Parameters<typeof translate>[1]) => string
) {
  if (report.riskLifecycleRows.length === 0) return page;

  const slide = pptx.addSlide();
  slide.background = { color: "F8FAFC" };
  addTitle(
    slide,
    getExecutiveReportSectionTitle(findReportSection(report, "risk-lifecycle-summary"), t),
    t("report.executiveReport").toUpperCase()
  );
  addTable(
    slide,
    [
      [t("labels.risk"), t("labels.owner"), t("labels.expo"), t("labels.actions"), t("labels.evidence"), t("labels.residual"), t("labels.review"), t("labels.lifecycleStage")],
      ...report.riskLifecycleRows.slice(0, 12).map(({ risk, lifecycle }) => [
        truncate(`${risk.riskCode ?? "Risk"} ${risk.title}`, 42),
        truncate(risk.owner?.fullName ?? "-", 22),
        riskExposure(risk),
        `${lifecycle.actionClosed}/${lifecycle.actionTotal}`,
        lifecycle.evidenceCount,
        lifecycle.residualExposure ?? "-",
        truncate(translateRiskReviewOutcome(risk.reviews?.[0]?.reviewOutcome, locale, t), 20),
        translateLifecycleStage(lifecycle.stageKey, t),
      ]),
    ],
    1.35,
    [3.0, 1.55, 0.55, 0.75, 0.7, 0.75, 1.3, 1.55],
    6.5
  );
  addFooter(slide, project, page);
  return page + 1;
}

function addManagementReviewRiskSlides(
  pptx: pptxgen,
  project: ExecutiveReportProject,
  page: number,
  report: ReturnType<typeof buildExecutiveReportViewModel>,
  riskReviewTypeHints: string[],
  locale: AppLocale,
  t: (key: Parameters<typeof translate>[1]) => string
) {
  report.managementReviewRisks.forEach(({ risk }) => {
    const latestInherent = risk.assessments
      ?.filter((assessment) => assessment.assessmentType === "INHERENT")
      .slice()
      .sort(
        (a, b) =>
          new Date(b.assessmentDate).getTime() -
          new Date(a.assessmentDate).getTime()
      )[0];
    const latestResidual = risk.assessments
      ?.filter((assessment) => assessment.assessmentType === "RESIDUAL")
      .slice()
      .sort(
        (a, b) =>
          new Date(b.assessmentDate).getTime() -
          new Date(a.assessmentDate).getTime()
      )[0];
    const evidenceRows = (risk.riskActions ?? []).flatMap((action) =>
      (action.evidenceRecords ?? []).map((evidence) => [
        truncate(translateEvidenceType(evidence.evidenceType, locale, t), 18),
        truncate(evidence.title, 38),
        formatReportDate(evidence.evidenceDate),
        truncate(evidence.documentReference ?? "-", 22),
      ])
    );
    const slide = pptx.addSlide();
    slide.background = { color: "FFFBEB" };
    addTitle(
      slide,
      `${getExecutiveReportSectionTitle(
        findReportSection(report, "risk-management-review"),
        t
      )}: ${truncate(risk.title, 54)}`,
      t("report.executiveReport").toUpperCase()
    );

    slide.addText(t("report.riskSnapshot").toUpperCase(), {
      x: 0.55,
      y: 1.16,
      w: 2,
      h: 0.14,
      fontSize: 7,
      bold: true,
      color: COLORS.muted,
      margin: 0,
    });
    addTable(
      slide,
      [
        [t("labels.code"), t("labels.owner"), t("labels.category"), t("labels.status"), t("labels.exposure"), t("labels.target")],
        [
          risk.riskCode ?? "-",
          truncate(risk.owner?.fullName ?? "-", 22),
          truncate(translateRiskCategory(risk.category, locale, t), 18),
          truncate(translateStatus(risk.status, locale, t), 18),
          riskExposure(risk),
          formatReportDate(risk.targetResolutionDate),
        ],
      ],
      1.35,
      [1.15, 2.0, 1.6, 1.55, 0.8, 1.25],
      7
    );

    slide.addText(t("report.assessmentBasis").toUpperCase(), {
      x: 0.55,
      y: 2.22,
      w: 2.2,
      h: 0.14,
      fontSize: 7,
      bold: true,
      color: COLORS.muted,
      margin: 0,
    });
    addTable(
      slide,
      [
        [t("labels.review"), t("labels.prob"), t("labels.impact"), t("labels.exposure"), t("table.date"), t("report.assessor"), t("labels.comments")],
        [
          translateAssessmentType("INHERENT", t),
          latestInherent?.probability ?? "-",
          latestInherent?.impact ?? "-",
          latestInherent?.exposure ?? "-",
          formatReportDate(latestInherent?.assessmentDate),
          truncate(latestInherent?.assessedByUser?.fullName ?? "-", 18),
          truncate(latestInherent?.comments ?? "-", 38),
        ],
        [
          translateAssessmentType("RESIDUAL", t),
          latestResidual?.probability ?? "-",
          latestResidual?.impact ?? "-",
          latestResidual?.exposure ?? "-",
          formatReportDate(latestResidual?.assessmentDate),
          truncate(latestResidual?.assessedByUser?.fullName ?? "-", 18),
          truncate(latestResidual?.comments ?? "-", 38),
        ],
      ],
      2.42,
      [1.15, 0.55, 0.65, 0.75, 1.05, 1.45, 3.2],
      6.2
    );

    slide.addText(t("report.mitigationEvidence").toUpperCase(), {
      x: 0.55,
      y: 3.48,
      w: 2.6,
      h: 0.14,
      fontSize: 7,
      bold: true,
      color: COLORS.muted,
      margin: 0,
    });
    addTable(
      slide,
      [
        [t("labels.action"), t("labels.dueDate"), t("labels.status"), t("labels.evidence")],
        ...(risk.riskActions ?? []).slice(0, 5).map((action) => [
          truncate(action.description, 48),
          formatReportDate(action.dueDate),
          truncate(translateStatus(action.statusRef, locale, t), 14),
          action.evidenceRecords?.length ?? 0,
        ]),
      ],
      3.66,
      [4.2, 1.0, 1.1, 0.75],
      6.2
    );
    addTable(
      slide,
      [
        [t("labels.type"), t("labels.title"), t("table.date"), t("labels.reference")],
        ...(evidenceRows.length > 0
          ? evidenceRows.slice(0, 4)
          : [["-", t("report.noStructuredEvidence"), "-", "-"]]),
      ],
      4.78,
      [1.35, 3.5, 1.0, 1.9],
      6
    );

    const latestReview = risk.reviews?.[0];
    const linkedDecisions =
      latestReview?.decisionLinks
        ?.map((link) => `${link.projectDecision.decisionCode ?? "Decision"} ${link.projectDecision.title}`)
        .join("; ") ?? t("report.noLinkedDecisions");

    slide.addText(t("report.reviewContext").toUpperCase(), {
      x: 0.55,
      y: 5.9,
      w: 3.1,
      h: 0.14,
      fontSize: 7,
      bold: true,
      color: COLORS.muted,
      margin: 0,
    });
    slide.addText(
      truncate(
        `${latestReview?.reviewType ? translateRiskReviewType(latestReview.reviewType, locale, t) : getReviewTypeHint(riskReviewTypeHints, t)} | ${translateRiskReviewOutcome(latestReview?.reviewOutcome, locale, t)} | ${formatReportDate(latestReview?.reviewDate)} | ${latestReview?.reviewedByUser?.fullName ?? "-"}\n${latestReview?.comments ?? ""}\n${t("report.linkedDecisions")}: ${linkedDecisions}`,
        430
      ),
      {
        x: 0.55,
        y: 6.12,
        w: 11.8,
        h: 0.58,
        fontSize: 6.8,
        color: COLORS.ink,
        margin: 0.08,
        fit: "shrink",
        fill: { color: "FFFFFF" },
        line: { color: COLORS.border, width: 0.5 },
      }
    );

    addFooter(slide, project, page);
    page += 1;
  });

  return page;
}

function getReviewTypeHint(
  riskReviewTypeHints: string[],
  t: (key: Parameters<typeof translate>[1]) => string
) {
  if (riskReviewTypeHints.length === 0) return t("report.noActiveReviewTypes");
  return `${t("report.configuredTypes")}: ${riskReviewTypeHints.join(", ")}`;
}

function addTimelineDateLabel(
  slide: pptxgen.Slide,
  label: string,
  x: number,
  align: "left" | "right" = "left"
) {
  slide.addText(label, {
    x,
    y: 2.62,
    w: 1.25,
    h: 0.12,
    fontSize: 6.5,
    color: COLORS.muted,
    margin: 0,
    align,
    fit: "shrink",
  });
}

function getPptBarStyle(kind: ExecutiveGanttBar["kind"]) {
  if (kind === "planned") return { fill: "9CA3AF", line: "9CA3AF", yOffset: 0.03, height: 0.07 };
  if (kind === "delay") return { fill: "EF4444", line: "EF4444", yOffset: 0.14, height: 0.08 };
  if (kind === "actual") return { fill: "2563EB", line: "2563EB", yOffset: 0.14, height: 0.08 };
  return { fill: "93C5FD", line: "2563EB", yOffset: 0.14, height: 0.08 };
}

function getLocalizedGanttLegend(t: (key: Parameters<typeof translate>[1]) => string) {
  return [
    t("timeline.legend.planned"),
    t("timeline.legend.inProgress"),
    t("timeline.legend.actual"),
    t("timeline.legend.delay"),
  ];
}

function translateVarianceLabel(
  label: ExecutiveGanttRow["variance"] extends infer V
    ? V extends { label: infer L }
      ? L
      : never
    : never,
  t: (key: Parameters<typeof translate>[1]) => string
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

function chunkRows<T>(rows: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
}

function addGanttTimelineHeader(
  slide: pptxgen.Slide,
  model: ExecutiveGanttModel,
  t: (key: Parameters<typeof translate>[1]) => string
) {
  const contract = EXECUTIVE_GANTT_OUTPUT_CONTRACT;

  slide.addText(t("labels.phase"), {
    x: contract.ppt.phaseX,
    y: 1.22,
    w: 2.0,
    h: 0.18,
    fontSize: 8,
    bold: true,
    color: COLORS.ink,
    margin: 0,
  });
  slide.addText(t("labels.workstreamEvent"), {
    x: contract.ppt.workstreamX,
    y: 1.22,
    w: 2.1,
    h: 0.18,
    fontSize: 8,
    bold: true,
    color: COLORS.ink,
    margin: 0,
  });
  slide.addText(t("labels.variance"), {
    x: contract.ppt.varianceX,
    y: 1.22,
    w: 1.0,
    h: 0.18,
    fontSize: 8,
    bold: true,
    color: COLORS.ink,
    margin: 0,
  });
  slide.addText(t("report.timeline"), {
    x: contract.ppt.timelineX,
    y: 1.22,
    w: contract.ppt.timelineW,
    h: 0.18,
    fontSize: 8,
    bold: true,
    color: COLORS.ink,
    margin: 0,
  });

  addTimelineDateLabel(slide, formatReportDate(model.min), contract.ppt.timelineX);
  addTimelineDateLabel(
    slide,
    formatReportDate(model.max),
    contract.ppt.timelineX + contract.ppt.timelineW - 1.25,
    "right"
  );

  let monthX = contract.ppt.timelineX;
  model.monthGroups.forEach((month) => {
    const monthW = (month.count / model.weeks.length) * contract.ppt.timelineW;
    slide.addText(month.label, {
      x: monthX,
      y: 1.5,
      w: monthW,
      h: 0.16,
      fontSize: 7,
      bold: true,
      align: "center",
      color: COLORS.ink,
      margin: 0,
      fit: "shrink",
    });
    monthX += monthW;
  });

  model.weeks.forEach((week, index) => {
    const weekX = contract.ppt.timelineX + (index / model.weeks.length) * contract.ppt.timelineW;
    slide.addText(String(week.getDate()).padStart(2, "0"), {
      x: weekX,
      y: 1.72,
      w: contract.ppt.timelineW / model.weeks.length,
      h: 0.12,
      fontSize: 6,
      color: COLORS.muted,
      align: "center",
      margin: 0,
      fit: "shrink",
    });
  });
}

function addGanttRow(
  slide: pptxgen.Slide,
  model: ExecutiveGanttModel,
  row: ExecutiveGanttRow,
  y: number,
  t: (key: Parameters<typeof translate>[1]) => string
) {
  const contract = EXECUTIVE_GANTT_OUTPUT_CONTRACT;
  const rowFill = row.kind === "phase" ? contract.colors.phaseRow : row.background.replace("#", "");

  slide.addShape("rect", {
    x: 0.35,
    y: y - 0.05,
    w: 12.65,
    h: 0.36,
    fill: { color: rowFill || "FFFFFF" },
    line: { color: "EDF2F7", width: 0.35 },
  });
  slide.addText(row.kind === "phase" ? `▼ ${row.phase}` : row.phase, {
    x: contract.ppt.phaseX,
    y,
    w: 2.1,
    h: 0.12,
    fontSize: 6.4,
    bold: row.kind === "phase" || row.kind === "milestone",
    color: COLORS.ink,
    margin: 0,
    fit: "shrink",
  });
  const namePrefix =
    row.kind === "task"
      ? `${t("labels.task")}: `
      : row.kind === "subtask"
        ? `${t("labels.subtask")}: `
        : "";
  const nameIndent = row.kind === "task" ? 0.12 : row.kind === "subtask" ? 0.24 : 0;
  slide.addText(`${namePrefix}${row.name}`, {
    x: contract.ppt.workstreamX + nameIndent,
    y,
    w: 2.15 - nameIndent,
    h: 0.12,
    fontSize: 6.4,
    bold: row.kind === "phase" || row.kind === "workstream",
    color: COLORS.ink,
    margin: 0,
    fit: "shrink",
  });
  slide.addShape("rect", {
    x: contract.ppt.varianceX - 0.05,
    y: y - 0.05,
    w: 1.05,
    h: 0.36,
    fill: { color: row.variance?.background.replace("#", "") ?? rowFill ?? "FFFFFF" },
    line: { color: "EDF2F7", width: 0.35 },
  });
  slide.addText(
    row.variance
      ? `${translateVarianceLabel(row.variance.label, t)}${row.variance.daysDelayed ? ` ${row.variance.daysDelayed}d` : ""}`
      : "",
    {
      x: contract.ppt.varianceX,
      y,
      w: 0.95,
      h: 0.12,
      fontSize: 6.2,
      bold: Boolean(row.variance),
      color: row.variance?.label === "Delayed" ? "991B1B" : COLORS.ink,
      margin: 0,
      fit: "shrink",
    }
  );

  slide.addShape("rect", {
    x: contract.ppt.timelineX,
    y: y + 0.06,
    w: contract.ppt.timelineW,
    h: 0.08,
    fill: { color: contract.colors.rowTrack },
    line: { color: contract.colors.rowTrack },
  });
  model.weeks.forEach((_, index) => {
    const x = contract.ppt.timelineX + (index / model.weeks.length) * contract.ppt.timelineW;
    slide.addShape("line", {
      x,
      y: y - 0.05,
      w: 0,
      h: 0.34,
      line: { color: "E5E7EB", width: 0.25 },
    });
  });
  if (model.todayLeftPct !== null) {
    const todayX = contract.ppt.timelineX + (model.todayLeftPct / 100) * contract.ppt.timelineW;
    slide.addShape("line", {
      x: todayX,
      y: y - 0.05,
      w: 0,
      h: 0.34,
      line: { color: contract.colors.delay, width: 0.8 },
    });
  }
  row.bars.forEach((bar) => {
    const style = getPptBarStyle(bar.kind);
    slide.addShape("roundRect", {
      x: contract.ppt.timelineX + (bar.leftPct / 100) * contract.ppt.timelineW,
      y: y + style.yOffset,
      w: Math.max(0.08, (bar.widthPct / 100) * contract.ppt.timelineW),
      h: style.height,
      fill: { color: style.fill },
      line: { color: style.line, width: 0.4 },
    });
  });
  row.markers.forEach((marker) => {
    const markerX = contract.ppt.timelineX + (marker.leftPct / 100) * contract.ppt.timelineW;
    slide.addShape("ellipse", {
      x: markerX - 0.035,
      y: y + 0.055,
      w: 0.07,
      h: 0.07,
      fill: { color: marker.completed ? contract.colors.completedMarker : "FFFFFF" },
      line: { color: marker.completed ? contract.colors.completedMarker : "EA580C", width: 0.9 },
    });
  });
}

function addGanttDetailSlides(
  pptx: pptxgen,
  project: ExecutiveReportProject,
  model: ExecutiveGanttModel,
  startPage: number,
  locale: AppLocale
) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  let page = startPage;
  const chunks = chunkRows(model.rows, EXECUTIVE_GANTT_OUTPUT_CONTRACT.ppt.rowsPerSlide);

  chunks.forEach((rows, index) => {
    const slide = pptx.addSlide();
    slide.background = { color: "FFFFFF" };
    addTitle(
      slide,
      `${t("report.ganttDetail")}${chunks.length > 1 ? ` (${index + 1}/${chunks.length})` : ""}`,
      t("report.executiveReport").toUpperCase()
    );
    slide.addText(
      `${t("timeline.range")}: ${formatReportDate(model.min)} -> ${formatReportDate(model.max)}   ${getLocalizedGanttLegend(t).join("   ")}`,
      {
        x: SLIDE.marginX,
        y: 1.0,
        w: 11.8,
        h: 0.16,
        fontSize: 7.5,
        color: COLORS.muted,
        margin: 0,
        fit: "shrink",
      }
    );
  addGanttTimelineHeader(slide, model, t);
    rows.forEach((row, rowIndex) => {
      addGanttRow(slide, model, row, 2.08 + rowIndex * 0.42, t);
    });
    addFooter(slide, project, page);
    page += 1;
  });

  return page;
}

export async function createExecutiveReportPptx({
  project,
  reportingPack,
  locale,
  riskReviewTypeHints = [],
  briefingOnly = false,
}: {
  project: ExecutiveReportProject;
  reportingPack: ExecutiveReportReportingPack | null;
  locale: AppLocale;
  riskReviewTypeHints?: string[];
  briefingOnly?: boolean;
}) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const report = buildExecutiveReportViewModel({
    project,
    reportingPack,
    pdfMode: true,
    includeDraftNarratives: true,
  });
  const briefing = buildExecutiveBriefingModel({ project, reportingPack, report, locale });
  const detailedNarrativeAsset = (objectKey: "executive-summary" | "accomplishments" | "issues-concerns" | "next-steps" | "management-ask" | "conclusion") =>
    findManagedNarrativeAsset(report.narrativeAssets, { objectKey, variant: "DETAILED" });
  const detailedNarrative = (objectKey: Parameters<typeof detailedNarrativeAsset>[0]) =>
    detailedNarrativeAsset(objectKey)?.content ?? null;
  const detailedNarrativeMode = (objectKey: Parameters<typeof detailedNarrativeAsset>[0]) =>
    resolveNarrativePresentationMode({
      preference: detailedNarrativeAsset(objectKey)?.presentationMode,
      objectKey,
    });

  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Project Ops System";
  pptx.company = project.issuerOrganization?.displayName ?? project.issuerOrganization?.name ?? "";
  pptx.subject = t("report.executiveReport");
  pptx.title = `${project.name} ${t("report.executiveReport")}`;
  pptx.theme = {
    headFontFace: "Aptos Display",
    bodyFontFace: "Aptos",
  };

  let page = 1;

  const briefingNarrativeText = (content: string | null, checkpoints = false) =>
    getNarrativePresentationItems(content, checkpoints ? "CHECKPOINTS" : "BULLETS")
      .flatMap((item) => [
        `${checkpoints ? "✓" : "•"}   ${item.text}`,
        ...item.children.map((child) => `      ◦   ${child}`),
      ])
      .join("\n");
  const addBriefingCard = (slide: pptxgen.Slide, title: string, body: string, x: number, y: number, w: number, h: number) => {
    slide.addShape("rect", { x, y, w, h, fill: { color: "FFFFFF" }, line: { color: COLORS.border, width: 1 } });
    slide.addText(title, { x: x + 0.12, y: y + 0.07, w: w - 0.24, h: 0.18, fontSize: 9.2, bold: true, color: COLORS.ink, margin: 0, fit: "shrink" });
    slide.addShape("line", { x: x + 0.12, y: y + 0.31, w: w - 0.24, h: 0, line: { color: COLORS.border, width: 0.6 } });
    if (body) {
      slide.addText(body, { x: x + 0.12, y: y + 0.38, w: w - 0.24, h: h - 0.45, fontSize: 6.8, color: COLORS.ink, margin: 0, breakLine: false, valign: "top", fit: "shrink", paraSpaceAfter: 1.5 });
    }
  };
  type BriefingMetricTile = {
    label: string;
    value: string | number;
    fill?: string;
    border?: string;
    group?: CockpitMetricGroup;
  };
  const addBriefingMetricTiles = (
    slide: pptxgen.Slide,
    title: string,
    metrics: BriefingMetricTile[],
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    addBriefingCard(slide, title, "", x, y, w, h);
    const gap = 0.05;
    const visibleMetrics = metrics.slice(0, 9);
    const lifecycleMetrics = visibleMetrics.filter((metric) => metric.group !== "attention");
    const attentionMetrics = visibleMetrics.filter((metric) => metric.group === "attention");
    const metricGroups = attentionMetrics.length > 0
      ? [lifecycleMetrics, attentionMetrics].filter((group) => group.length > 0)
      : [visibleMetrics];
    const contentTop = y + 0.39;
    const contentH = h - 0.48;
    const groupGap = metricGroups.length > 1 ? 0.07 : 0;
    const columns = visibleMetrics.length > 4 ? 3 : 2;
    const totalRows = metricGroups.reduce(
      (sum, group) => sum + Math.ceil(group.length / columns),
      0
    );
    const tileW = (w - 0.24 - gap * (columns - 1)) / columns;
    const tileH = Math.min(
      0.3,
      (contentH - groupGap * Math.max(metricGroups.length - 1, 0) - gap * Math.max(totalRows - metricGroups.length, 0)) / Math.max(totalRows, 1)
    );
    let rowOffset = 0;

    metricGroups.forEach((group, groupIndex) => {
      const groupY = contentTop + rowOffset * (tileH + gap) + groupIndex * groupGap;
      group.forEach((metric, index) => {
        const tileX = x + 0.12 + (index % columns) * (tileW + gap);
        const tileY = groupY + Math.floor(index / columns) * (tileH + gap);
        slide.addShape("roundRect", {
          x: tileX,
          y: tileY,
          w: tileW,
          h: tileH,
          rectRadius: 0.03,
          fill: { color: metric.fill ?? COLORS.panel },
          line: { color: metric.border ?? COLORS.border, width: 0.6 },
        });
        slide.addText(metric.label, {
          x: tileX + 0.04,
          y: tileY + 0.03,
          w: tileW * 0.62,
          h: Math.max(0.05, tileH - 0.04),
          fontSize: columns === 3 ? 4.4 : 5.6,
          bold: true,
          color: COLORS.muted,
          margin: 0,
          fit: "shrink",
        });
        slide.addText(String(metric.value), {
          x: tileX + tileW * 0.68,
          y: tileY + 0.03,
          w: tileW * 0.25,
          h: Math.max(0.05, tileH - 0.04),
          fontSize: columns === 3 ? 8 : 10.5,
          bold: true,
          color: COLORS.ink,
          margin: 0,
          align: "right",
          fit: "shrink",
        });
      });
      rowOffset += Math.ceil(group.length / columns);
    });
  };
  const addBriefingDeliveryMetricTiles = (
    slide: pptxgen.Slide,
    title: string,
    groups: Array<{ title: string; metrics: BriefingMetricTile[] }>,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    addBriefingCard(slide, title, "", x, y, w, h);
    const visibleGroups = groups
      .map((group) => ({ ...group, metrics: group.metrics.slice(0, 2) }))
      .filter((group) => group.metrics.length > 0);
    if (visibleGroups.length === 0) return;

    const gap = 0.05;
    const columns = 2;
    const contentTop = y + 0.38;
    const contentH = h - 0.46;
    const groupGap = 0.04;
    const groupH = (contentH - groupGap * Math.max(visibleGroups.length - 1, 0)) / visibleGroups.length;
    const tileW = (w - 0.24 - gap) / columns;
    const tileH = Math.min(0.2, Math.max(0.1, groupH - 0.16));

    visibleGroups.forEach((group, groupIndex) => {
      const groupY = contentTop + groupIndex * (groupH + groupGap);
      slide.addText(group.title, {
        x: x + 0.12,
        y: groupY,
        w: w - 0.24,
        h: 0.1,
        fontSize: 4.8,
        bold: true,
        color: COLORS.muted,
        margin: 0,
        fit: "shrink",
      });
      group.metrics.forEach((metric, index) => {
        const tileX = x + 0.12 + index * (tileW + gap);
        const tileY = groupY + 0.13;
        slide.addShape("roundRect", {
          x: tileX,
          y: tileY,
          w: tileW,
          h: tileH,
          rectRadius: 0.03,
          fill: { color: metric.fill ?? COLORS.panel },
          line: { color: metric.border ?? COLORS.border, width: 0.6 },
        });
        slide.addText(metric.label, {
          x: tileX + 0.04,
          y: tileY + 0.03,
          w: tileW * 0.6,
          h: Math.max(0.05, tileH - 0.04),
          fontSize: 4.8,
          bold: true,
          color: COLORS.muted,
          margin: 0,
          fit: "shrink",
        });
        slide.addText(String(metric.value), {
          x: tileX + tileW * 0.66,
          y: tileY + 0.03,
          w: tileW * 0.28,
          h: Math.max(0.05, tileH - 0.04),
          fontSize: 8.2,
          bold: true,
          color: COLORS.ink,
          margin: 0,
          align: "right",
          fit: "shrink",
        });
      });
    });
  };
  const toBriefingMetricTiles = (metrics: CockpitMetric[]) =>
    sortCockpitMetrics(translateCockpitMetrics(metrics, t)).map((metric) => {
      const colors = cockpitMetricToneColors[metric.tone];
      return {
        label: metric.label,
        value: metric.value,
        group: metric.group,
        fill: pptColor(colors.background),
        border: pptColor(colors.border),
      };
    });
  const addBriefingSlide = (slidePage: number) => {
    const slide = pptx.addSlide();
    slide.background = { color: "FFFFFF" };
    addTitle(slide, project.name, t("report.executiveBriefing").toUpperCase());
    const gantt = buildExecutiveGanttModel({
      projectWorkstreams: report.projectWorkstreams,
      projectEvents: briefing.timelineEvents,
      today: report.reportDate,
    });
    const timelineRows = gantt?.rows.filter((row) => row.kind === "phase" || row.kind === "milestone") ?? [];
    const timelineTop = 1.12;
    const timelineHeaderTop = 1.33;
    const rowsTop = 1.62;
    const timelineBottom = 3.72;
    const labelW = 3.05;
    const varianceW = 1.05;
    const gridX = 0.55 + labelW + varianceW + 0.12;
    const gridW = 12.17 - labelW - varianceW - 0.12;
    const rowHeight = Math.min(0.24, (timelineBottom - rowsTop) / Math.max(timelineRows.length, 1));
    slide.addText(t("report.timeline"), { x: 0.45, y: timelineTop, w: 2.0, h: 0.16, fontSize: 9, bold: true, color: COLORS.ink, margin: 0 });
    slide.addText(`${t("timeline.range")}: ${formatReportDate(gantt?.min)} -> ${formatReportDate(gantt?.max)}`, { x: 2.1, y: timelineTop + 0.01, w: 3.0, h: 0.13, fontSize: 6.5, color: COLORS.muted, margin: 0, fit: "shrink" });
    slide.addText(getLocalizedGanttLegend(t).join("   "), { x: 5.15, y: timelineTop + 0.01, w: 7.45, h: 0.13, fontSize: 6.2, color: COLORS.muted, margin: 0, fit: "shrink" });
    slide.addShape("rect", { x: 0.45, y: timelineHeaderTop - 0.06, w: 12.27, h: timelineBottom - timelineHeaderTop + 0.06, fill: { color: "F8FAFC" }, line: { color: COLORS.border, width: 0.6 } });
    gantt?.monthGroups.forEach((month, index) => {
      const weeksBefore = gantt.monthGroups.slice(0, index).reduce((sum, item) => sum + item.count, 0);
      const x = gridX + gridW * weeksBefore / gantt.weeks.length;
      const w = gridW * month.count / gantt.weeks.length;
      slide.addText(month.label, { x, y: timelineHeaderTop, w, h: 0.12, fontSize: 6.2, bold: true, align: "center", color: COLORS.ink, margin: 0, fit: "shrink" });
    });
    gantt?.weeks.forEach((week, index) => {
      const x = gridX + gridW * index / gantt.weeks.length;
      slide.addShape("line", { x, y: timelineHeaderTop + 0.23, w: 0, h: timelineBottom - timelineHeaderTop - 0.23, line: { color: "E5E7EB", width: 0.35 } });
      slide.addText(String(week.getDate()).padStart(2, "0"), { x, y: timelineHeaderTop + 0.14, w: gridW / gantt.weeks.length, h: 0.1, fontSize: 5.6, color: COLORS.muted, align: "center", margin: 0 });
    });
    timelineRows.forEach((row, index) => {
      const y = rowsTop + index * rowHeight;
      slide.addShape("rect", { x: 0.45, y, w: 12.27, h: rowHeight, fill: { color: row.kind === "phase" ? "F1F5F9" : "FFFFFF", transparency: row.kind === "phase" ? 0 : 28 }, line: { color: "FFFFFF", transparency: 100 } });
      slide.addText(row.kind === "phase" ? row.phase : row.name, { x: 0.55, y: y + 0.04, w: labelW, h: Math.max(0.1, rowHeight - 0.04), fontSize: 6.4, bold: row.kind === "phase", color: COLORS.ink, margin: 0, fit: "shrink" });
      slide.addText(row.variance ? translateVarianceLabel(row.variance.label, t) : "", { x: 0.55 + labelW, y: y + 0.04, w: varianceW, h: Math.max(0.1, rowHeight - 0.04), fontSize: 5.9, bold: Boolean(row.variance), color: COLORS.ink, margin: 0, fit: "shrink" });
      slide.addShape("line", { x: gridX, y: y + rowHeight - 0.01, w: gridW, h: 0, line: { color: "E2E8F0", width: 0.4 } });
      row.bars.forEach((bar) => {
        const style = getPptBarStyle(bar.kind);
        slide.addShape("rect", { x: gridX + gridW * bar.leftPct / 100, y: y + (bar.kind === "planned" ? rowHeight * 0.28 : rowHeight * 0.58), w: Math.max(0.05, gridW * bar.widthPct / 100), h: Math.max(0.045, rowHeight * 0.22), fill: { color: style.fill }, line: { color: style.fill, transparency: 100 } });
      });
      row.markers.forEach((marker) => slide.addShape("ellipse", { x: gridX + gridW * marker.leftPct / 100 - 0.035, y: y + rowHeight * 0.35, w: 0.08, h: 0.08, fill: { color: marker.completed ? COLORS.blue : "9CA3AF" }, line: { color: marker.completed ? COLORS.blue : "9CA3AF" } }));
    });
    if (gantt?.todayLeftPct != null) slide.addShape("line", { x: gridX + gridW * gantt.todayLeftPct / 100, y: timelineHeaderTop - 0.02, w: 0, h: timelineBottom - timelineHeaderTop + 0.02, line: { color: "EF4444", width: 1, dashType: "dash" } });
    const deliveryWorkstreamMetrics = toBriefingMetricTiles(report.workstreamCockpitMetrics);
    const deliveryMilestoneMetrics = toBriefingMetricTiles(report.milestoneCockpitMetrics);
    const riskMetrics = toBriefingMetricTiles(report.riskCockpitMetrics);
    const decisionMetrics = toBriefingMetricTiles(report.decisionCockpitMetrics);
    const cards: Array<[string, string]> = [
      [t("report.executiveSummary"), briefingNarrativeText(briefing.narratives.executiveSummary, true)],
      [locale === "es" ? "Estado de entrega" : "Delivery Status", ""],
      [locale === "es" ? "Pulso del proyecto" : "Project Pulse", ""],
      [t("report.progressSinceLastReport"), briefingNarrativeText(briefing.narratives.progressSinceLastReport)],
      [locale === "es" ? "Riesgos" : "Risks", ""],
      [locale === "es" ? "Decisiones" : "Decisions", ""],
      [t("report.issuesConcerns"), briefingNarrativeText(briefing.narratives.issuesConcerns)],
      [t("report.nextSteps"), briefingNarrativeText(briefing.narratives.nextSteps)],
    ];
    cards.forEach(([title, body], index) => {
      const x = 0.45 + (index % 4) * 3.12;
      const y = 3.84 + Math.floor(index / 4) * 1.06;
      if (index === 1) {
        addBriefingDeliveryMetricTiles(slide, title, [
          { title: locale === "es" ? "ACTIVIDADES" : "WORKSTREAMS", metrics: deliveryWorkstreamMetrics },
          { title: locale === "es" ? "HITOS" : "MILESTONES", metrics: deliveryMilestoneMetrics },
        ], x, y, 2.98, 0.98);
      } else if (index === 2) {
        addBriefingMetricTiles(slide, title, briefing.pulse.map((item) => ({ label: item.label, value: item.value })), x, y, 2.98, 0.98);
      } else if (index === 4) {
        addBriefingMetricTiles(slide, title, riskMetrics, x, y, 2.98, 1.06);
      } else if (index === 5) {
        addBriefingMetricTiles(slide, title, decisionMetrics, x, y, 2.98, 1.06);
      } else {
        addBriefingCard(slide, title, body, x, y, 2.98, 0.98);
      }
    });
    addBriefingCard(slide, t("report.managementAsk"), briefingNarrativeText(briefing.narratives.managementAsk), 0.45, 6.02, 6.05, 0.82);
    addBriefingCard(slide, t("report.conclusion"), briefingNarrativeText(briefing.narratives.conclusion, true), 6.67, 6.02, 6.05, 0.82);
    addFooter(slide, project, slidePage);
  };

  if (briefingOnly) {
    addBriefingSlide(page);
    const output = await pptx.write({ outputType: "arraybuffer", compression: true });
    return Buffer.from(output as ArrayBuffer);
  }

  const cover = pptx.addSlide();
  cover.background = { color: "FFFFFF" };
  cover.addShape("rect", {
    x: 0,
    y: 0,
    w: SLIDE.width,
    h: 0.1,
    fill: { color: COLORS.blue },
    line: { color: COLORS.blue },
  });

  const issuerLogo = await getImageSource(project.issuerOrganization?.logoUrl);
  const clientLogo = await getImageSource(project.clientOrganization?.logoUrl);
  if (issuerLogo) {
    cover.addImage({ ...issuerLogo, x: 0.55, y: 0.35, w: 1.9, h: 0.55, sizing: { type: "contain", w: 1.9, h: 0.55 } });
  }
  if (clientLogo) {
    cover.addImage({ ...clientLogo, x: 10.9, y: 0.35, w: 1.9, h: 0.55, sizing: { type: "contain", w: 1.9, h: 0.55 } });
  }

  cover.addText(project.name, {
    x: 1.2,
    y: 2.45,
    w: 10.9,
    h: 0.65,
    fontSize: 30,
    bold: true,
    color: COLORS.ink,
    align: "center",
    margin: 0,
    fit: "shrink",
  });
  cover.addText(t("report.executiveReport"), {
    x: 1.2,
    y: 3.2,
    w: 10.9,
    h: 0.34,
    fontSize: 17,
    bold: true,
    color: COLORS.muted,
    align: "center",
    margin: 0,
  });
  cover.addShape("line", {
    x: 1.1,
    y: 6.18,
    w: 11.1,
    h: 0,
    line: { color: COLORS.border, width: 1 },
  });
  addCoverMeta(
    cover,
    t("labels.projectManager"),
    project.projectManagerContact?.name ?? "-",
    1.1,
    6.32,
    3.6
  );
  addCoverMeta(cover, t("labels.version"), reportingPack ? `v${reportingPack.version}` : "-", 5.05, 6.32, 2.3);
  addCoverMeta(cover, t("labels.reportingDate"), formatReportMonthYear(reportingPack?.reportingDate), 8.05, 6.32, 3.9);

  page += 1;

  addBriefingSlide(page);
  page += 1;

  const index = pptx.addSlide();
  index.background = { color: "FFFFFF" };
  addTitle(index, t("report.index"), t("report.executiveReport").toUpperCase());
  report.sections.forEach((section, idx) => {
    const y = 1.25 + idx * 0.38;
    index.addShape("ellipse", {
      x: 0.65,
      y,
      w: 0.24,
      h: 0.24,
      fill: { color: "F1F5F9" },
      line: { color: COLORS.border },
    });
    index.addText(String(idx + 1), {
      x: 0.65,
      y: y + 0.04,
      w: 0.24,
      h: 0.1,
      fontSize: 6.5,
      bold: true,
      color: COLORS.muted,
      align: "center",
      margin: 0,
    });
    index.addText(getExecutiveReportSectionTitle(section, t), {
      x: 1.05,
      y: y - 0.01,
      w: 10.8,
      h: 0.25,
      fontSize: 12,
      color: COLORS.ink,
      bold: true,
      margin: 0,
      fit: "shrink",
    });
  });
  addFooter(index, project, page);
  page += 1;

  page = addNarrativeSlide(pptx, project, page, t("report.executiveSummary"), detailedNarrative("executive-summary"), t("report.executiveReport").toUpperCase(), detailedNarrativeMode("executive-summary"));
  page = addNarrativeSlide(pptx, project, page, t("report.achievements"), detailedNarrative("accomplishments"), t("report.executiveReport").toUpperCase(), detailedNarrativeMode("accomplishments"));
  page = addNarrativeSlide(pptx, project, page, t("report.issuesConcerns"), detailedNarrative("issues-concerns"), t("report.executiveReport").toUpperCase(), detailedNarrativeMode("issues-concerns"));

  if (report.decisions.length > 0) {
    const slide = pptx.addSlide();
    slide.background = { color: "FFFFFF" };
    addTitle(
      slide,
      getExecutiveReportSectionTitle(findReportSection(report, "decision-cockpit"), t),
      t("report.executiveReport").toUpperCase()
    );
    const decisionAttentionRows = Math.max(report.executiveDecisionAttention.slice(0, 5).length, 1);
    const decisionOutcomeRows = Math.max(report.recentDecisionOutcomes.slice(0, 3).length, 1);
    const decisionAttentionHeight = 0.55 + decisionAttentionRows * 0.3;
    const decisionOutcomeHeight = 0.55 + decisionOutcomeRows * 0.3;
    const decisionGap = Math.max(
      0.32,
      (6.65 - 1.18 - 1.05 - decisionAttentionHeight - decisionOutcomeHeight) / 2
    );
    const decisionAttentionTitleY = 1.18 + 1.05 + decisionGap;
    const decisionOutcomeTitleY = decisionAttentionTitleY + decisionAttentionHeight + decisionGap;
    addCockpitMetrics(slide, report.decisionCockpitMetrics, 1.18, locale);
    slide.addText(t("report.executiveDecisionAttention"), {
      x: SLIDE.marginX,
      y: decisionAttentionTitleY,
      w: 6,
      h: 0.2,
      fontSize: 10,
      bold: true,
      color: COLORS.ink,
      margin: 0,
    });
    addTable(
      slide,
      [
        [t("labels.title"), t("labels.recommendation"), t("labels.owner"), t("labels.dueDate"), t("labels.impact"), t("labels.status")],
        ...report.executiveDecisionAttention.slice(0, 5).map((decision) => [
          truncate(decision.title, 42),
          truncate(decision.recommendation, 70),
          truncate(decision.owner, 18),
          formatReportDate(decision.dueDate),
          translateImpact(decision.impact, t),
          translateStatus(decision.statusRef, locale, t),
        ]),
      ],
      decisionAttentionTitleY + 0.28,
      [2.3, 4.0, 1.35, 1.05, 1.05, 1.25],
      7
    );
    slide.addText(t("report.recentDecisionOutcomes"), {
      x: SLIDE.marginX,
      y: decisionOutcomeTitleY,
      w: 6,
      h: 0.2,
      fontSize: 10,
      bold: true,
      color: COLORS.ink,
      margin: 0,
    });
    addTable(
      slide,
      [
        [t("labels.title"), t("labels.outcome"), t("labels.decisionDate"), t("labels.status")],
        ...report.recentDecisionOutcomes.slice(0, 3).map((decision) => [
          truncate(decision.title, 48),
          truncate(decision.decision, 95),
          formatReportDate(decision.decisionDate ?? decision.updatedAt),
          translateStatus(decision.statusRef, locale, t),
        ]),
      ],
      decisionOutcomeTitleY + 0.28,
      [2.7, 6.5, 1.45, 1.25],
      7
    );
    addFooter(slide, project, page);
    page += 1;
  }

  let riskSlide = pptx.addSlide();
  riskSlide.background = { color: "FFFFFF" };
  addTitle(
    riskSlide,
    getExecutiveReportSectionTitle(findReportSection(report, "risk-cockpit"), t),
    t("report.executiveReport").toUpperCase()
  );
  const firstRiskContentHeight = report.attentionRisks.length === 0
    ? 0.55
    : report.attentionRisks.reduce(
        (height, risk) => height + 0.64 + Math.max(risk.riskActions.length, 1) * 0.3,
        0.35
      );
  const riskGap = Math.max(0.35, Math.min(3, 6.65 - 1.14 - 0.7 - firstRiskContentHeight));
  const riskAttentionTitleY = 1.14 + 0.7 + riskGap;
  addCockpitMetrics(riskSlide, report.riskCockpitMetrics, 1.14, locale);
  riskSlide.addText(t("report.riskAttention"), {
    x: SLIDE.marginX,
    y: riskAttentionTitleY,
    w: 5,
    h: 0.2,
    fontSize: 10,
    bold: true,
    color: COLORS.ink,
    margin: 0,
  });
  riskSlide.addText(t("labels.risk"), {
    x: 0.55,
    y: riskAttentionTitleY + 0.22,
    w: 4.4,
    h: 0.12,
    fontSize: 7,
    bold: true,
    color: COLORS.muted,
    margin: 0,
  });
  riskSlide.addText(t("labels.category"), {
    x: 5.05,
    y: riskAttentionTitleY + 0.22,
    w: 1.4,
    h: 0.12,
    fontSize: 7,
    bold: true,
    color: COLORS.muted,
    margin: 0,
  });
  riskSlide.addText(t("labels.exposure"), {
    x: 6.55,
    y: riskAttentionTitleY + 0.22,
    w: 0.7,
    h: 0.12,
    fontSize: 7,
    bold: true,
    color: COLORS.muted,
    margin: 0,
  });
  riskSlide.addText(t("labels.owner"), {
    x: 7.35,
    y: riskAttentionTitleY + 0.22,
    w: 1.5,
    h: 0.12,
    fontSize: 7,
    bold: true,
    color: COLORS.muted,
    margin: 0,
  });
  riskSlide.addText(t("labels.status"), {
    x: 9.05,
    y: riskAttentionTitleY + 0.22,
    w: 1.5,
    h: 0.12,
    fontSize: 7,
    bold: true,
    color: COLORS.muted,
    margin: 0,
  });
  riskSlide.addText(t("labels.target"), {
    x: 10.75,
    y: riskAttentionTitleY + 0.22,
    w: 1.2,
    h: 0.12,
    fontSize: 7,
    bold: true,
    color: COLORS.muted,
    margin: 0,
  });

  let riskY = riskAttentionTitleY + 0.44;
  report.attentionRisks.forEach((risk, index) => {
    const actionsHeight = 0.26 + Math.max(risk.riskActions.length, 1) * 0.3;
    if (riskY + 0.42 + actionsHeight > 6.75) {
      addFooter(riskSlide, project, page);
      page += 1;
      riskSlide = pptx.addSlide();
      riskSlide.background = { color: "FFFFFF" };
      addTitle(
        riskSlide,
        getExecutiveReportSectionTitle(findReportSection(report, "risk-cockpit"), t),
        t("report.executiveReport").toUpperCase()
      );
      riskSlide.addText(t("report.riskAttention"), {
        x: SLIDE.marginX,
        y: 1.1,
        w: 5,
        h: 0.2,
        fontSize: 10,
        bold: true,
        color: COLORS.ink,
        margin: 0,
      });
      riskY = 1.25;
    }

    addRiskRow(riskSlide, risk, riskY, locale, t);
    riskY += 0.42;
    riskY += addRiskActionRows(riskSlide, risk, riskY, locale, t) + 0.22;

    if (index === report.attentionRisks.length - 1 && report.attentionRisks.length === 0) {
      riskSlide.addText(t("report.noExecutiveRiskAttentionItems"), {
        x: SLIDE.marginX,
        y: 2.2,
        w: 4,
        h: 0.25,
        fontSize: 10,
        bold: true,
        color: COLORS.muted,
        margin: 0,
      });
    }
  });
  if (report.attentionRisks.length === 0) {
    riskSlide.addText(t("report.noExecutiveRiskAttentionItems"), {
      x: SLIDE.marginX,
      y: riskAttentionTitleY + 0.44,
      w: 4,
      h: 0.25,
      fontSize: 10,
      bold: true,
      color: COLORS.muted,
      margin: 0,
    });
  }
  addFooter(riskSlide, project, page);
  page += 1;

  page = addRiskLifecycleSummarySlide(pptx, project, page, report, locale, t);
  page = addManagementReviewRiskSlides(
    pptx,
    project,
    page,
    report,
    riskReviewTypeHints,
    locale,
    t
  );

  if (report.projectWorkstreams.length > 0 || report.projectEvents.length > 0) {
    const workstreamSlide = pptx.addSlide();
    workstreamSlide.background = { color: "FFFFFF" };
    addTitle(
      workstreamSlide,
      getExecutiveReportSectionTitle(findReportSection(report, "workstreams"), t),
      t("report.executiveReport").toUpperCase()
    );
    if (report.projectWorkstreams.length > 0) {
      addCockpitMetrics(workstreamSlide, report.workstreamCockpitMetrics, 1.25, locale);
    }
    if (report.projectEvents.length > 0) {
      workstreamSlide.addShape("line", {
        x: SLIDE.marginX,
        y: 3.85,
        w: 12.4,
        h: 0,
        line: { color: COLORS.border, width: 1 },
      });
      workstreamSlide.addText(
        getExecutiveReportSectionTitle(findReportSection(report, "milestones"), t),
        {
          x: SLIDE.marginX,
          y: 4.05,
          w: 6,
          h: 0.26,
          fontSize: 13,
          bold: true,
          color: COLORS.ink,
          margin: 0,
        }
      );
      addCockpitMetrics(workstreamSlide, report.milestoneCockpitMetrics, 4.38, locale);
    }
    addFooter(workstreamSlide, project, page);
    page += 1;
  }

  if (report.projectWorkstreams.length > 0 || report.projectEvents.length > 0) {
    const ganttModel = buildExecutiveGanttModel({
      projectWorkstreams: report.projectWorkstreams,
      projectEvents: report.projectEvents,
    });

    if (ganttModel) {
      page = addGanttDetailSlides(pptx, project, ganttModel, page, locale);
    }
  }

  page = addNarrativeSlide(pptx, project, page, t("report.nextSteps"), detailedNarrative("next-steps"), t("report.executiveReport").toUpperCase(), detailedNarrativeMode("next-steps"));
  page = addNarrativeSlide(pptx, project, page, t("report.managementAsk"), detailedNarrative("management-ask"), t("report.executiveReport").toUpperCase(), detailedNarrativeMode("management-ask"));
  addNarrativeSlide(pptx, project, page, t("report.conclusion"), detailedNarrative("conclusion"), t("report.executiveReport").toUpperCase(), detailedNarrativeMode("conclusion"));

  const output = await pptx.write({ outputType: "arraybuffer", compression: true });
  return Buffer.from(output as ArrayBuffer);
}
