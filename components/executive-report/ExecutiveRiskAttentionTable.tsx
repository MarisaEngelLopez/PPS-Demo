"use client";

import { Fragment, useState } from "react";
import { useTranslation } from "@/components/i18n/TranslationProvider";
import {
  sectionHeaderStyle,
  sectionTitleStyle,
  highlightedSectionPanelStyle,
  buttonStyle,
} from "@/components/ui/layoutStyles";
import { tableStyle, thStyle, tdStyle } from "@/components/ui/tableStyles";
import { requiresExecutiveRiskAttention } from "@/lib/domain/reporting/executiveReportRules";
import type {
  ExecutiveReportRisk,
  ExecutiveReportRiskAction,
} from "@/lib/domain/reporting/executiveReportTypes";

type Props = {
  risks: ExecutiveReportRisk[];
};

function formatDate(value?: Date | string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function getExposureStyle(exposure: number) {
  if (exposure >= 15) {
    return { background: "#fecaca", color: "#991b1b" };
  }

  if (exposure >= 7) {
    return { background: "#fed7aa", color: "#9a3412" };
  }

  return { background: "#bbf7d0", color: "#166534" };
}

export function ExecutiveRiskAttentionTable({ risks }: Props) {
  const { t } = useTranslation();
  const [expandedRiskIds, setExpandedRiskIds] = useState<Record<string, boolean>>(
    {}
  );

  const attentionRisks = risks
    .filter((risk) => requiresExecutiveRiskAttention(risk))
    .sort((a, b) => {
      const exposureA = a.exposure ?? a.probability * a.impact;
      const exposureB = b.exposure ?? b.probability * b.impact;
      return exposureB - exposureA;
    });

const allExpanded =
  attentionRisks.length > 0 &&
  attentionRisks.every((risk) => expandedRiskIds[risk.id]);

  function toggleRisk(riskId: string) {
    setExpandedRiskIds((current) => ({
      ...current,
      [riskId]: !current[riskId],
    }));
  }


  return (
    <section className="section-panel">
      <div
  style={{
    ...sectionHeaderStyle,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  }}
>
  <div style={sectionTitleStyle}>{t("report.riskAttention")}</div>

  <div style={{ display: "flex", gap: "0.5rem" }}>
    <button
  type="button"
  style={{
    ...buttonStyle,
    opacity: allExpanded ? 1 : 0.65,
  }}
  onClick={() =>
    setExpandedRiskIds(
      Object.fromEntries(attentionRisks.map((risk) => [risk.id, true]))
    )
  }
>
  {t("actions.expandAll")}
</button>

<button
  type="button"
  style={{
    ...buttonStyle,
    opacity: !allExpanded ? 1 : 0.65,
  }}
  onClick={() => setExpandedRiskIds({})}
>
  {t("actions.collapseAll")}
</button>
  </div>
</div>

      {attentionRisks.length === 0 ? (
        <div
          style={{
            ...highlightedSectionPanelStyle,
            background: "#dcfce7",
            color: "#166534",
            fontWeight: 600,
          }}
        >
          {t("report.noExecutiveRiskAttentionItems")}
        </div>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: "left" }}>{t("labels.risk")}</th>
              <th style={{ ...thStyle, textAlign: "left" }}>{t("labels.category")}</th>
              <th style={{ ...thStyle, textAlign: "left" }}>{t("labels.exposure")}</th>
              <th style={{ ...thStyle, textAlign: "left" }}>{t("labels.owner")}</th>
              <th style={{ ...thStyle, textAlign: "left" }}>{t("labels.status")}</th>
              <th style={{ ...thStyle, textAlign: "left" }}>{t("labels.target")}</th>
            </tr>
          </thead>

          <tbody>
            {attentionRisks.map((risk) => {
              const exposure = risk.exposure ?? risk.probability * risk.impact;
              const isExpanded = expandedRiskIds[risk.id] ?? false;

              return (
                <Fragment key={risk.id}>
                  <tr
                    key={risk.id}
                    onClick={() => toggleRisk(risk.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <td style={tdStyle}>
                      <strong>{isExpanded ? "▼" : "▶"} {risk.title}</strong>
                    </td>
                    <td style={tdStyle}>{risk.category?.name ?? "-"}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: "inline-block",
                          minWidth: "32px",
                          textAlign: "center",
                          padding: "0.2rem 0.35rem",
                          borderRadius: "6px",
                          fontWeight: 700,
                          ...getExposureStyle(exposure),
                        }}
                      >
                        {exposure}
                      </span>
                    </td>
                    <td style={tdStyle}>{risk.owner?.fullName ?? "-"}</td>
                    <td style={tdStyle}>{risk.status?.name ?? "-"}</td>
                    <td style={tdStyle}>{formatDate(risk.targetResolutionDate)}</td>
                  </tr>

                  {isExpanded && (
                    <tr>
                      <td style={tdStyle} colSpan={6}>
                        <div
                          style={{
                            ...highlightedSectionPanelStyle,
                            marginTop: "0.5rem",
                          }}
                        >
                         {(risk.description || risk.trigger) && (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "0.75rem",
      marginBottom: "0.75rem",
    }}
  >
    {risk.description && (
      <div>
        <strong>{t("labels.description")}</strong>
        <p>{risk.description}</p>
      </div>
    )}

    {risk.trigger && (
      <div>
        <strong>{t("labels.trigger")}</strong>
        <p>{risk.trigger}</p>
      </div>
    )}
  </div>
)}

                          <strong>{t("sections.mitigationActions")}</strong>

                          <table style={{ ...tableStyle, marginTop: "0.5rem" }}>
                            <thead>
                              <tr>
                                <th style={{ ...thStyle, textAlign: "left" }}>
                                  {t("labels.action")}
                                </th>
                                <th style={{ ...thStyle, textAlign: "left" }}>
                                  {t("labels.owner")}
                                </th>
                                <th style={{ ...thStyle, textAlign: "left" }}>
                                  {t("labels.dueDate")}
                                </th>
                                <th style={{ ...thStyle, textAlign: "left" }}>
                                  {t("labels.status")}
                                </th>
                                <th style={{ ...thStyle, textAlign: "left" }}>
                                  {t("labels.evidenceComment")}
                                </th>
                              </tr>
                            </thead>

                            <tbody>
                              {(risk.riskActions ?? []).map((action: ExecutiveReportRiskAction) => (
                                <tr key={action.id}>
                                  <td style={tdStyle}>{action.description}</td>
                                  <td style={tdStyle}>
                                    {action.owner?.fullName ?? "-"}
                                  </td>
                                  <td style={tdStyle}>
                                    {formatDate(action.dueDate)}
                                  </td>
                                  <td style={tdStyle}>
                                    {action.statusRef?.name ?? "-"}
                                  </td>
                                  <td style={tdStyle}>{action.evidence ?? "-"}</td>
                                </tr>
                              ))}

                              {(risk.riskActions ?? []).length === 0 && (
                                <tr>
                                  <td style={tdStyle} colSpan={5}>
                                    {t("report.noMitigationActions")}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
