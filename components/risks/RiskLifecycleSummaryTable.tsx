"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "@/components/i18n/TranslationProvider";
import {
  FilterField,
  FilterSelectInput,
} from "@/components/ui/FormFields";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TranslatedText } from "@/components/ui/TranslatedControls";
import {
  filterInputStyle,
  sectionPanelStyle,
} from "@/components/ui/layoutStyles";
import { StandardTable, TableEmptyRow } from "@/components/ui/TablePrimitives";
import { tdStyle, thStyle } from "@/components/ui/tableStyles";
import { getExposureStyle } from "@/lib/domain/risks/riskContract";
import {
  getConfiguredOptions,
  translateConfiguredOption,
  translateRiskLifecycleStage,
} from "@/lib/i18n/displayTranslations";
import {
  deriveRiskLifecycleSummary,
  RISK_LIFECYCLE_STAGES,
  sortRiskLifecycleSummaries,
  type RiskLifecycleConfig,
  type RiskLifecycleStageKey,
} from "@/lib/domain/risks/riskLifecycle";

type NamedOption = {
  id: string;
  code?: string | null;
  name: string;
  nameEs?: string | null;
};

type RiskLifecycleAction = {
  statusRef?: { code?: string | null } | null;
  evidenceRecords?: unknown[];
};

type RiskLifecycleAssessment = {
  assessmentType: "INHERENT" | "RESIDUAL";
  exposure: number;
  assessmentDate: Date | string;
};

type RiskLifecycleReview = {
  reviewDate: Date | string;
  reviewOutcome?: {
    code?: string | null;
    name?: string | null;
    nameEs?: string | null;
    isClosed?: boolean;
    isPending?: boolean;
  } | null;
};

type RiskLifecycleRowData = {
  id: string;
  riskCode: string | null;
  title: string;
  projectId: string;
  categoryId: string;
  category?: { code?: string | null; name: string; nameEs?: string | null } | null;
  ownerId: string | null;
  owner?: { fullName: string } | null;
  status?: { code: string; name: string; nameEs?: string | null } | null;
  exposure: number;
  createdAt: Date | string;
  riskActions: RiskLifecycleAction[];
  assessments: RiskLifecycleAssessment[];
  reviews: RiskLifecycleReview[];
};

export function RiskLifecycleSummaryTable({
  risks,
  users,
  riskCategories,
  lifecycleConfig,
}: {
  risks: RiskLifecycleRowData[];
  users: { id: string; fullName: string }[];
  riskCategories: NamedOption[];
  lifecycleConfig: RiskLifecycleConfig;
}) {
  const [stageFilter, setStageFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [needsReviewOnly, setNeedsReviewOnly] = useState(false);
  const [includeClosed, setIncludeClosed] = useState(false);
  const { t, locale } = useTranslation();

  const rows = useMemo(() => {
    const derivedRows = risks.map((risk) => ({
      risk,
      lifecycle: deriveRiskLifecycleSummary(risk, lifecycleConfig),
    }));

    return sortRiskLifecycleSummaries(derivedRows).filter(({ risk, lifecycle }) => {
      if (!includeClosed && lifecycle.isClosed) return false;
      if (stageFilter && lifecycle.stageKey !== stageFilter) return false;
      if (ownerFilter && risk.ownerId !== ownerFilter) return false;
      if (categoryFilter && risk.categoryId !== categoryFilter) return false;
      if (needsReviewOnly && !lifecycle.needsManagementReview) return false;
      return true;
    });
  }, [
    risks,
    lifecycleConfig,
    stageFilter,
    ownerFilter,
    categoryFilter,
    needsReviewOnly,
    includeClosed,
  ]);

  const stageOptions = RISK_LIFECYCLE_STAGES.map((stage) => ({
    value: stage.key,
    label: translateRiskLifecycleStage(stage.key, t),
  }));
  const ownerOptions = users.map((user) => ({
    value: user.id,
    label: user.fullName,
  }));
  const categoryOptions = getConfiguredOptions(
    riskCategories,
    locale,
    t,
    "riskCategory"
  );

  return (
    <section style={{ marginBottom: "1rem" }}>
      <SectionHeader title={<TranslatedText labelKey="sections.riskLifecycleSummary" />} />

      <div
        style={{
          ...sectionPanelStyle,
          background: "#f8fafc",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          alignItems: "end",
          marginBottom: "0.75rem",
        }}
      >
        <FilterField label={<TranslatedText labelKey="labels.lifecycleStage" />}>
          <FilterSelectInput
            value={stageFilter}
            onChange={(event) =>
              setStageFilter(event.target.value as RiskLifecycleStageKey | "")
            }
            placeholder={t("filters.allStages")}
            options={stageOptions}
          />
        </FilterField>

        <FilterField label={<TranslatedText labelKey="labels.owner" />}>
          <FilterSelectInput
            value={ownerFilter}
            onChange={(event) => setOwnerFilter(event.target.value)}
            placeholder={t("filters.allOwners")}
            options={ownerOptions}
          />
        </FilterField>

        <FilterField label={<TranslatedText labelKey="labels.category" />}>
          <FilterSelectInput
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            placeholder={t("filters.allCategories")}
            options={categoryOptions}
          />
        </FilterField>

        <label style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
          <input
            type="checkbox"
            checked={needsReviewOnly}
            onChange={(event) => setNeedsReviewOnly(event.target.checked)}
          />
          <TranslatedText labelKey="labels.needsManagementReview" />
        </label>

        <label style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
          <input
            type="checkbox"
            checked={includeClosed}
            onChange={(event) => setIncludeClosed(event.target.checked)}
          />
          <TranslatedText labelKey="labels.includeClosed" />
        </label>

        <button
          type="button"
          style={{ ...filterInputStyle, width: "auto", cursor: "pointer" }}
          onClick={() => {
            setStageFilter("");
            setOwnerFilter("");
            setCategoryFilter("");
            setNeedsReviewOnly(false);
            setIncludeClosed(false);
          }}
        >
          <TranslatedText labelKey="filters.clear" />
        </button>
      </div>

      <StandardTable>
        <thead>
          <tr>
            <th style={thStyle}><TranslatedText labelKey="labels.title" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.owner" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.category" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.initialExposure" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.actions" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.evidence" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.residualExposure" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.review" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.lifecycleStage" /></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ risk, lifecycle }) => (
            <tr key={risk.id}>
              <td style={tdStyle}>
                <strong>{risk.riskCode ?? "Risk"}</strong> {risk.title}
              </td>
              <td style={tdStyle}>{risk.owner?.fullName ?? "-"}</td>
              <td style={tdStyle}>
                {translateConfiguredOption(risk.category, locale, t, "riskCategory") || "-"}
              </td>
              <td style={tdStyle}>
                <ExposureBadge value={risk.exposure} />
              </td>
              <td style={tdStyle}>
                {lifecycle.actionClosed}/{lifecycle.actionTotal}
              </td>
              <td style={tdStyle}>{lifecycle.evidenceCount}</td>
              <td style={tdStyle}>
                {lifecycle.residualExposure === null ? (
                  "-"
                ) : (
                  <ExposureBadge value={lifecycle.residualExposure} />
                )}
              </td>
              <td style={tdStyle}>
                {translateConfiguredOption(
                  getLatestReviewOutcome(risk.reviews),
                  locale,
                  t,
                  "riskReviewOutcome"
                ) ||
                  lifecycle.latestReviewOutcome ||
                  "-"}
              </td>
              <td style={tdStyle}>
                <span
                  style={{
                    fontWeight: 700,
                    color: lifecycle.needsManagementReview
                      ? "#9a3412"
                      : "#334155",
                  }}
                >
                  {translateRiskLifecycleStage(lifecycle.stageKey, t)}
                </span>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <TableEmptyRow colSpan={9}>
              <TranslatedText labelKey="empty.noRiskLifecycleMatches" />
            </TableEmptyRow>
          )}
        </tbody>
      </StandardTable>
    </section>
  );
}

function ExposureBadge({ value }: { value: number }) {
  return (
    <span
      style={{
        display: "inline-block",
        minWidth: "32px",
        textAlign: "center",
        padding: "0.2rem 0.35rem",
        borderRadius: "6px",
        fontWeight: 600,
        ...getExposureStyle(value),
      }}
    >
      {value}
    </span>
  );
}

function getLatestReviewOutcome(reviews: RiskLifecycleReview[]) {
  return reviews
    .slice()
    .sort(
      (a, b) =>
        new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime()
    )[0]?.reviewOutcome;
}
