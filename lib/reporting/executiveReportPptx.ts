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
import { buildExecutiveReportViewModel } from "@/lib/domain/reporting/executiveReportViewModel";
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
  kicker = "EXECUTIVE REPORT"
) {
  const chunks = chunkNarrativeText(text, {
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
      x: 0.9,
      y: 1.35,
      w: 11.55,
      h: 4.95,
      fontSize: 13,
      color: COLORS.ink,
      valign: "top",
      breakLine: false,
      margin: 0.16,
      fill: { color: COLORS.panel },
      line: { color: COLORS.border, width: 1 },
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
}: {
  project: ExecutiveReportProject;
  reportingPack: ExecutiveReportReportingPack | null;
  locale: AppLocale;
  riskReviewTypeHints?: string[];
}) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const report = buildExecutiveReportViewModel({
    project,
    reportingPack,
    pdfMode: true,
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

  page = addNarrativeSlide(pptx, project, page, t("report.executiveSummary"), reportingPack?.executiveSummary, t("report.executiveReport").toUpperCase());
  page = addNarrativeSlide(pptx, project, page, t("report.achievements"), reportingPack?.achievements, t("report.executiveReport").toUpperCase());
  page = addNarrativeSlide(pptx, project, page, t("report.issuesConcerns"), reportingPack?.issues, t("report.executiveReport").toUpperCase());

  if (report.decisions.length > 0) {
    const slide = pptx.addSlide();
    slide.background = { color: "FFFFFF" };
    addTitle(
      slide,
      getExecutiveReportSectionTitle(findReportSection(report, "decision-cockpit"), t),
      t("report.executiveReport").toUpperCase()
    );
    addCockpitMetrics(slide, report.decisionCockpitMetrics, 1.18, locale);
    slide.addText(t("report.executiveDecisionAttention"), {
      x: SLIDE.marginX,
      y: 2.62,
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
      2.9,
      [2.3, 4.0, 1.35, 1.05, 1.05, 1.25],
      7
    );
    slide.addText(t("report.recentDecisionOutcomes"), {
      x: SLIDE.marginX,
      y: 5.25,
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
      5.52,
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
  addCockpitMetrics(riskSlide, report.riskCockpitMetrics, 1.14, locale);
  riskSlide.addText(t("report.riskAttention"), {
    x: SLIDE.marginX,
    y: 1.86,
    w: 5,
    h: 0.2,
    fontSize: 10,
    bold: true,
    color: COLORS.ink,
    margin: 0,
  });
  riskSlide.addText(t("labels.risk"), {
    x: 0.55,
    y: 2.08,
    w: 4.4,
    h: 0.12,
    fontSize: 7,
    bold: true,
    color: COLORS.muted,
    margin: 0,
  });
  riskSlide.addText(t("labels.category"), {
    x: 5.05,
    y: 2.08,
    w: 1.4,
    h: 0.12,
    fontSize: 7,
    bold: true,
    color: COLORS.muted,
    margin: 0,
  });
  riskSlide.addText(t("labels.exposure"), {
    x: 6.55,
    y: 2.08,
    w: 0.7,
    h: 0.12,
    fontSize: 7,
    bold: true,
    color: COLORS.muted,
    margin: 0,
  });
  riskSlide.addText(t("labels.owner"), {
    x: 7.35,
    y: 2.08,
    w: 1.5,
    h: 0.12,
    fontSize: 7,
    bold: true,
    color: COLORS.muted,
    margin: 0,
  });
  riskSlide.addText(t("labels.status"), {
    x: 9.05,
    y: 2.08,
    w: 1.5,
    h: 0.12,
    fontSize: 7,
    bold: true,
    color: COLORS.muted,
    margin: 0,
  });
  riskSlide.addText(t("labels.target"), {
    x: 10.75,
    y: 2.08,
    w: 1.2,
    h: 0.12,
    fontSize: 7,
    bold: true,
    color: COLORS.muted,
    margin: 0,
  });

  let riskY = 2.3;
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
      y: 2.2,
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

  if (report.projectWorkstreams.length > 0) {
    const workstreamSlide = pptx.addSlide();
    workstreamSlide.background = { color: "FFFFFF" };
    addTitle(
      workstreamSlide,
      getExecutiveReportSectionTitle(findReportSection(report, "workstreams"), t),
      t("report.executiveReport").toUpperCase()
    );
    addCockpitMetrics(workstreamSlide, report.workstreamCockpitMetrics, 1.42, locale);
    addFooter(workstreamSlide, project, page);
    page += 1;
  }

  if (report.projectEvents.length > 0) {
    const milestoneSlide = pptx.addSlide();
    milestoneSlide.background = { color: "FFFFFF" };
    addTitle(
      milestoneSlide,
      getExecutiveReportSectionTitle(findReportSection(report, "milestones"), t),
      t("report.executiveReport").toUpperCase()
    );
    addCockpitMetrics(milestoneSlide, report.milestoneCockpitMetrics, 1.42, locale);
    addFooter(milestoneSlide, project, page);
    page += 1;
  }

  if (report.projectWorkstreams.length > 0 || report.projectEvents.length > 0) {
    const ganttModel = buildExecutiveGanttModel({
      projectWorkstreams: report.projectWorkstreams,
      projectEvents: report.projectEvents,
    });

    if (ganttModel) {
      const slide = pptx.addSlide();
      slide.background = { color: "FFFFFF" };
      addTitle(
        slide,
        getExecutiveReportSectionTitle(findReportSection(report, "gantt-detail"), t),
        t("report.executiveReport").toUpperCase()
      );
      slide.addText(t("report.timeline"), {
        x: 0.55,
        y: 1.2,
        w: 6.8,
        h: 0.24,
        fontSize: 12,
        bold: true,
        color: COLORS.ink,
        margin: 0,
      });
      slide.addText(
        `${t("timeline.range")}: ${formatReportDate(ganttModel.min)} -> ${formatReportDate(ganttModel.max)}`,
        {
          x: 0.55,
          y: 1.6,
          w: 5.2,
          h: 0.18,
          fontSize: 9,
          color: COLORS.muted,
          margin: 0,
        }
      );
      slide.addText(getLocalizedGanttLegend(t).join("   "), {
        x: 0.55,
        y: 1.95,
        w: 9.5,
        h: 0.18,
        fontSize: 8,
        color: COLORS.muted,
        margin: 0,
        fit: "shrink",
      });
      addFooter(slide, project, page);
      page += 1;
      page = addGanttDetailSlides(pptx, project, ganttModel, page, locale);
    }
  }

  page = addNarrativeSlide(pptx, project, page, t("report.nextSteps"), reportingPack?.nextSteps, t("report.executiveReport").toUpperCase());
  page = addNarrativeSlide(pptx, project, page, t("report.managementAsk"), reportingPack?.managementAsk, t("report.executiveReport").toUpperCase());
  addNarrativeSlide(pptx, project, page, t("report.conclusion"), reportingPack?.conclusion, t("report.executiveReport").toUpperCase());

  const output = await pptx.write({ outputType: "arraybuffer", compression: true });
  return Buffer.from(output as ArrayBuffer);
}
