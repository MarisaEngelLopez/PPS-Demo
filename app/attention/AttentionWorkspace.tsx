"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslation } from "@/components/i18n/TranslationProvider";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import type {
  AttentionCategory,
  AttentionItem,
  AttentionSeverity,
} from "@/lib/domain/attention/attentionEngine";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  filterInputStyle,
  pageToggleButtonStyle,
  sectionPanelStyle,
} from "@/components/ui/layoutStyles";
import { tableStyle, tdStyle, thStyle } from "@/components/ui/tableStyles";

const severityColors: Record<AttentionSeverity, { background: string; border: string; color: string }> = {
  Critical: { background: "#fecaca", border: "#f87171", color: "#991b1b" },
  High: { background: "#fed7aa", border: "#fb923c", color: "#9a3412" },
  Medium: { background: "#fef3c7", border: "#facc15", color: "#92400e" },
  Low: { background: "#dbeafe", border: "#93c5fd", color: "#1e3a8a" },
};

const categories: AttentionCategory[] = [
  "Workstream",
  "Milestone",
  "Risk",
  "Risk Action",
  "Decision",
  "Reporting",
  "Time Tracking",
];

const severities: AttentionSeverity[] = ["Critical", "High", "Medium", "Low"];
const ALL_PROJECTS = "ALL";
const ATTENTION_PROJECT_FILTER_KEY = "attentionProjectFilter";

type Translator = (key: TranslationKey) => string;

const severityLabelKeys: Record<AttentionSeverity, TranslationKey> = {
  Critical: "attention.severity.critical",
  High: "attention.severity.high",
  Medium: "attention.severity.medium",
  Low: "attention.severity.low",
};

const categoryLabelKeys: Record<AttentionCategory, TranslationKey> = {
  Workstream: "attention.category.workstream",
  Milestone: "attention.category.milestone",
  Risk: "attention.category.risk",
  "Risk Action": "attention.category.riskAction",
  Decision: "attention.category.decision",
  Reporting: "attention.category.reporting",
  "Time Tracking": "attention.category.timeTracking",
  "Agent Suggestion": "attention.category.agentSuggestion",
};

const actionLabelKeys: Partial<Record<string, TranslationKey>> = {
  "Open Time Tracking": "attention.action.openTimeTracking",
  "Open Workstream": "attention.action.openWorkstream",
  "Open Milestone": "attention.action.openMilestone",
  "Open Risk": "attention.action.openRisk",
  "Open Risk Evidence": "attention.action.openRiskEvidence",
  "Open Risk Assessment": "attention.action.openRiskAssessment",
  "Open Management Review": "attention.action.openManagementReview",
  "Open Risk Action": "attention.action.openRiskAction",
  "Open Decision": "attention.action.openDecision",
  "Open Reporting": "attention.action.openReporting",
  "Open Reporting Pack": "attention.action.openReportingPack",
};

function attentionCardStyle(severity: AttentionSeverity) {
  const color = severityColors[severity];
  return {
    border: `1px solid ${color.border}`,
    borderRadius: "8px",
    background: "#ffffff",
    padding: "0.7rem",
    display: "grid",
    gap: "0.35rem",
    borderLeft: `5px solid ${color.border}`,
  };
}

function severityBadgeStyle(severity: AttentionSeverity) {
  const color = severityColors[severity];
  return {
    display: "inline-flex",
    alignItems: "center",
    width: "fit-content",
    padding: "0.16rem 0.45rem",
    borderRadius: "999px",
    border: `1px solid ${color.border}`,
    background: color.background,
    color: color.color,
    fontSize: "0.68rem",
    fontWeight: 700,
  };
}

function stat(items: AttentionItem[], severity: AttentionSeverity) {
  return items.filter((item) => item.severity === severity).length;
}

function translateActionLabel(label: string, t: Translator) {
  const labelKey = actionLabelKeys[label];
  return labelKey ? t(labelKey) : label;
}

function translateGeneratedTitle(title: string, t: Translator) {
  return title === "No reporting pack found" ? t("attention.title.noReportingPackFound") : title;
}

function translateDescription(description: string, t: Translator) {
  if (description.startsWith("Risk action for: ")) {
    return t("attention.description.riskActionFor").replace(
      "{title}",
      description.replace("Risk action for: ", "")
    );
  }

  const descriptionKeys: Partial<Record<string, TranslationKey>> = {
    "Time tracking session is paused and waiting to resume or finish.":
      "attention.description.timeSessionPaused",
    "Time tracking session is still open and should be paused or finished.":
      "attention.description.timeSessionOpen",
    "Workstream has no actual start date although the planned start date has passed.":
      "attention.description.workstreamStartOverdue",
    "Workstream is still open although the planned end date has passed.":
      "attention.description.workstreamEndOverdue",
    "Milestone date has passed and the milestone is not completed.":
      "attention.description.milestoneOverdue",
    "Risk exposure is above the attention threshold.":
      "attention.description.riskExposureHigh",
    "Risk has no mitigation actions.": "attention.description.riskNoActions",
    "Risk mitigation has actions but no structured evidence records.":
      "attention.description.riskNoEvidence",
    "All mitigation actions are closed. A residual risk assessment is required.":
      "attention.description.riskResidualAssessment",
    "Residual assessment is recorded and the risk is pending management review.":
      "attention.description.riskManagementReview",
    "Decision due date has passed and the decision is not closed.":
      "attention.description.decisionOverdue",
    "Decision is escalated and still open.": "attention.description.decisionEscalated",
    "Project has no active reporting pack.": "attention.description.reportMissing",
    "Reporting pack is ready and waiting for approval.": "attention.description.reportReady",
    "Latest report is older than the attention threshold.":
      "attention.description.reportStale",
  };

  if (description === "Risk requires attention for one or more reasons.") {
    return t("attention.description.riskRequiresAttention");
  }

  const descriptionKey = descriptionKeys[description];
  return descriptionKey ? t(descriptionKey) : description;
}

function translateReason(reason: string, t: Translator): string {
  if (reason.includes(" | ")) {
    return reason.split(" | ").map((item) => translateReason(item, t)).join("; ");
  }
  const dayReasonPatterns: { pattern: RegExp; key: TranslationKey }[] = [
    {
      pattern: /^Planned start passed by (\d+) day\(s\)\.$/,
      key: "attention.reason.plannedStartPassed",
    },
    {
      pattern: /^Planned end passed by (\d+) day\(s\)\.$/,
      key: "attention.reason.plannedEndPassed",
    },
    {
      pattern: /^Milestone overdue by (\d+) day\(s\)\.$/,
      key: "attention.reason.milestoneOverdue",
    },
    {
      pattern: /^Risk action overdue by (\d+) day\(s\)\.$/,
      key: "attention.reason.riskActionOverdue",
    },
    {
      pattern: /^Decision overdue by (\d+) day\(s\)\.$/,
      key: "attention.reason.decisionOverdue",
    },
    {
      pattern: /^Latest report is (\d+) day\(s\) old\.$/,
      key: "attention.reason.reportStale",
    },
  ];

  for (const { pattern, key } of dayReasonPatterns) {
    const match = reason.match(pattern);
    if (match) return t(key).replace("{days}", match[1]);
  }

  const exposureMatch = reason.match(/^Exposure (\d+)\.$/);
  if (exposureMatch) {
    return t("attention.reason.exposure").replace("{exposure}", exposureMatch[1]);
  }

  const reasonKeys: Partial<Record<string, TranslationKey>> = {
    "Paused work session is still open.": "attention.reason.pausedWorkSessionOpen",
    "Active work session is still open.": "attention.reason.activeWorkSessionOpen",
    "No mitigation actions recorded.": "attention.reason.noMitigationActions",
    "No evidence recorded for mitigation actions.": "attention.reason.noMitigationEvidence",
    "Residual assessment pending.": "attention.reason.residualAssessmentPending",
    "Management review pending.": "attention.reason.managementReviewPending",
    "Risk is escalated.": "attention.reason.riskEscalated",
    "Escalated decision.": "attention.reason.escalatedDecision",
    "No active report exists for the project.": "attention.reason.noActiveReport",
    "Reporting pack pending approval.": "attention.reason.reportingPackPendingApproval",
  };

  const reasonKey = reasonKeys[reason];
  return reasonKey ? t(reasonKey) : reason;
}

function getInitialProjectFilter(items: AttentionItem[]) {
  if (typeof window === "undefined") return ALL_PROJECTS;
  const stored = localStorage.getItem(ATTENTION_PROJECT_FILTER_KEY);
  if (stored === ALL_PROJECTS) return ALL_PROJECTS;
  return items.some((item) => item.projectId === stored) ? stored ?? ALL_PROJECTS : ALL_PROJECTS;
}

export function AttentionWorkspace({ items }: { items: AttentionItem[] }) {
  const { t } = useTranslation();
  const [projectFilter, setProjectFilter] = useState(() => getInitialProjectFilter(items));
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const projectOptions = useMemo(() => {
    const uniqueProjects = new Map<
      string,
      { id: string; projectCode: string; projectName: string }
    >();
    for (const item of items) {
      uniqueProjects.set(item.projectId, {
        id: item.projectId,
        projectCode: item.projectCode,
        projectName: item.projectName,
      });
    }
    return Array.from(uniqueProjects.values()).sort((a, b) =>
      `${a.projectCode} ${a.projectName}`.localeCompare(`${b.projectCode} ${b.projectName}`)
    );
  }, [items]);

  const filteredItems = useMemo(
    () =>
      items.filter(
        (item) =>
          (projectFilter === ALL_PROJECTS || item.projectId === projectFilter) &&
          (categoryFilter === "ALL" || item.category === categoryFilter) &&
          (severityFilter === "ALL" || item.severity === severityFilter)
      ),
    [items, projectFilter, categoryFilter, severityFilter]
  );

  const projectFilteredItems = useMemo(
    () =>
      items.filter(
        (item) => projectFilter === ALL_PROJECTS || item.projectId === projectFilter
      ),
    [items, projectFilter]
  );

  function handleProjectFilterChange(nextProjectId: string) {
    setProjectFilter(nextProjectId);
    localStorage.setItem(ATTENTION_PROJECT_FILTER_KEY, nextProjectId);
  }

  return (
    <>
      <section
        style={{
          ...sectionPanelStyle,
          display: "grid",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: "0.5rem",
          }}
        >
          {(["Critical", "High", "Medium", "Low"] as AttentionSeverity[]).map(
            (severity) => (
              <div
                key={severity}
                style={{
                  border: `1px solid ${severityColors[severity].border}`,
                  borderRadius: "8px",
                  background: severityColors[severity].background,
                  padding: "0.55rem",
                  color: severityColors[severity].color,
                }}
              >
                <div style={{ fontSize: "0.68rem", fontWeight: 700 }}>
                  {t(severityLabelKeys[severity])}
                </div>
                <div style={{ fontSize: "1.2rem", fontWeight: 800 }}>
                  {stat(projectFilteredItems, severity)}
                </div>
              </div>
            )
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "0.75rem",
            alignItems: "end",
          }}
        >
          <label>
            {t("labels.project")}
            <select
              value={projectFilter}
              onChange={(event) => handleProjectFilterChange(event.target.value)}
              style={filterInputStyle}
            >
              <option value={ALL_PROJECTS}>{t("filters.allProjects")}</option>
              {projectOptions.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.projectCode} - {project.projectName}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("attention.category")}
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              style={filterInputStyle}
            >
              <option value="ALL">{t("attention.allCategories")}</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {t(categoryLabelKeys[category])}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("attention.severity")}
            <select
              value={severityFilter}
              onChange={(event) => setSeverityFilter(event.target.value)}
              style={filterInputStyle}
            >
              <option value="ALL">{t("attention.allSeverities")}</option>
              {severities.map((severity) => (
                <option key={severity} value={severity}>
                  {t(severityLabelKeys[severity])}
                </option>
              ))}
            </select>
          </label>
          <div style={{ color: "#475569", fontSize: "0.78rem" }}>
            {t("attention.countSummary")
              .replace("{shown}", String(filteredItems.length))
              .replace("{total}", String(projectFilteredItems.length))}
          </div>
        </div>
      </section>

      <SectionHeader title={t("attention.dailyItems")} />
      <div
        style={{
          display: "grid",
          gap: "0.65rem",
          marginBottom: "1rem",
        }}
      >
        {filteredItems.length === 0 ? (
          <div style={{ ...sectionPanelStyle, color: "#64748b" }}>
            {t("attention.empty")}
          </div>
        ) : (
          filteredItems.map((item) => (
            <article key={item.id} style={attentionCardStyle(item.severity)}>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <span style={severityBadgeStyle(item.severity)}>
                  {t(severityLabelKeys[item.severity])}
                </span>
                <span style={{ color: "#475569", fontSize: "0.72rem", fontWeight: 700 }}>
                  {t(categoryLabelKeys[item.category])}
                </span>
                <span style={{ color: "#475569", fontSize: "0.72rem" }}>
                  {item.projectCode} - {item.projectName}
                </span>
              </div>
              <div style={{ fontWeight: 700, color: "#0f172a" }}>
                {translateGeneratedTitle(item.title, t)}
              </div>
              <div style={{ color: "#334155", fontSize: "0.82rem" }}>
                {translateDescription(item.description, t)}
              </div>
              <div style={{ color: "#475569", fontSize: "0.76rem" }}>
                <strong>{t("attention.reason")}:</strong> {translateReason(item.attentionReason, t)}
                {item.dueDate ? ` | ${t("table.date")}: ${item.dueDate}` : ""}
                {item.owner ? ` | ${t("table.owner")}: ${item.owner}` : ""}
              </div>
              <Link href={item.actionHref} style={pageToggleButtonStyle}>
                {translateActionLabel(item.actionLabel, t)}
              </Link>
            </article>
          ))
        )}
      </div>

      <SectionHeader title={t("attention.tableView")} />
      <div className="responsive-table-shell">
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>{t("attention.severity")}</th>
              <th style={thStyle}>{t("attention.category")}</th>
              <th style={thStyle}>{t("table.project")}</th>
              <th style={thStyle}>{t("table.item")}</th>
              <th style={thStyle}>{t("attention.reason")}</th>
              <th style={thStyle}>{t("table.date")}</th>
              <th style={thStyle}>{t("table.owner")}</th>
              <th style={thStyle}>{t("table.action")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td style={{ ...tdStyle, color: "#64748b" }} colSpan={8}>
                  {t("attention.empty")}
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={`table-${item.id}`}>
                  <td style={tdStyle}>{t(severityLabelKeys[item.severity])}</td>
                  <td style={tdStyle}>{t(categoryLabelKeys[item.category])}</td>
                  <td style={tdStyle}>{item.projectCode}</td>
                  <td style={tdStyle}>{translateGeneratedTitle(item.title, t)}</td>
                  <td style={tdStyle}>{translateReason(item.attentionReason, t)}</td>
                  <td style={tdStyle}>{item.dueDate || "-"}</td>
                  <td style={tdStyle}>{item.owner || "-"}</td>
                  <td style={tdStyle}>
                    <Link href={item.actionHref} style={pageToggleButtonStyle}>
                      {t("actions.open")}
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
