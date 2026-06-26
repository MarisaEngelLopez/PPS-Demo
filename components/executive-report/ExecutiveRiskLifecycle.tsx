import type { ReactNode } from "react";
import { tableStyle, tdStyle, thStyle } from "@/components/ui/tableStyles";
import { getExposureStyle } from "@/lib/domain/risks/riskContract";
import type { ExecutiveRiskLifecycleRow } from "@/lib/domain/reporting/executiveRiskLifecycle";
import type { ExecutiveReportRisk } from "@/lib/domain/reporting/executiveReportTypes";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

function formatDate(value?: Date | string | null) {
  if (!value) return "-";
  return new Date(value).toISOString().slice(0, 10);
}

export type ExecutiveRiskLifecycleLabels = {
  action: string;
  actions: string;
  assessor: string;
  assessmentBasis: string;
  category: string;
  comments: string;
  configuredTypes: string;
  contingencyPlan: string;
  date: string;
  description: string;
  dueDate: string;
  evidence: string;
  evidenceSummary: string;
  exposure: string;
  impact: string;
  inherentAssessment: string;
  initialExposure: string;
  latestReview: string;
  lifecycle: string;
  linkedDecisions: string;
  mitigationEvidence: string;
  mitigationPlan: string;
  noActiveReviewTypes: string;
  noLinkedDecisions: string;
  noMitigationActions: string;
  noRiskLifecycleItems: string;
  noStructuredEvidence: string;
  notRecorded: string;
  outcome: string;
  owner: string;
  probability: string;
  reference: string;
  residual: string;
  residualAssessment: string;
  residualExposure: string;
  review: string;
  reviewComments: string;
  reviewContext: string;
  reviewDate: string;
  reviewType: string;
  reviewer: string;
  risk: string;
  riskSnapshot: string;
  status: string;
  target: string;
  title: string;
  type: string;
};

export const defaultExecutiveRiskLifecycleLabels: ExecutiveRiskLifecycleLabels = {
  action: "Action",
  actions: "Actions",
  assessor: "Assessor",
  assessmentBasis: "Assessment Basis",
  category: "Category",
  comments: "Comments",
  configuredTypes: "Configured types",
  contingencyPlan: "Contingency Plan",
  date: "Date",
  description: "Description",
  dueDate: "Due",
  evidence: "Evidence",
  evidenceSummary: "Evidence Summary",
  exposure: "Exposure",
  impact: "Impact",
  inherentAssessment: "Inherent Assessment",
  initialExposure: "Initial Exposure",
  latestReview: "Latest Review",
  lifecycle: "Lifecycle",
  linkedDecisions: "Linked Decisions",
  mitigationEvidence: "Mitigation & Evidence",
  mitigationPlan: "Mitigation Plan",
  noActiveReviewTypes: "No active review types configured.",
  noLinkedDecisions: "No linked decisions.",
  noMitigationActions: "No mitigation actions recorded.",
  noRiskLifecycleItems: "No risk lifecycle items to show.",
  noStructuredEvidence: "No structured evidence recorded.",
  notRecorded: "Not recorded.",
  outcome: "Outcome",
  owner: "Owner",
  probability: "Probability",
  reference: "Reference",
  residual: "Residual",
  residualAssessment: "Residual Assessment",
  residualExposure: "Residual Exposure",
  review: "Review",
  reviewComments: "Review Comments",
  reviewContext: "Review Context",
  reviewDate: "Review Date",
  reviewType: "Review Type",
  reviewer: "Reviewer",
  risk: "Risk",
  riskSnapshot: "Risk Snapshot",
  status: "Status",
  target: "Target",
  title: "Title",
  type: "Type",
};

export function buildExecutiveRiskLifecycleLabels(
  t: (key: TranslationKey) => string
): ExecutiveRiskLifecycleLabels {
  return {
    action: t("labels.action"),
    actions: t("labels.actions"),
    assessor: t("report.assessor"),
    assessmentBasis: t("report.assessmentBasis"),
    category: t("labels.category"),
    comments: t("labels.comments"),
    configuredTypes: t("report.configuredTypes"),
    contingencyPlan: t("report.contingencyPlan"),
    date: t("table.date"),
    description: t("labels.description"),
    dueDate: t("labels.dueDate"),
    evidence: t("labels.evidence"),
    evidenceSummary: t("report.evidenceSummary"),
    exposure: t("labels.exposure"),
    impact: t("labels.impact"),
    inherentAssessment: t("report.inherentAssessment"),
    initialExposure: t("labels.initialExposure"),
    latestReview: t("labels.latestReview"),
    lifecycle: t("labels.lifecycleStage"),
    linkedDecisions: t("report.linkedDecisions"),
    mitigationEvidence: t("report.mitigationEvidence"),
    mitigationPlan: t("report.mitigationPlan"),
    noActiveReviewTypes: t("report.noActiveReviewTypes"),
    noLinkedDecisions: t("report.noLinkedDecisions"),
    noMitigationActions: t("report.noMitigationActions"),
    noRiskLifecycleItems: t("report.noRiskLifecycleItems"),
    noStructuredEvidence: t("report.noStructuredEvidence"),
    notRecorded: t("report.notRecorded"),
    outcome: t("labels.outcome"),
    owner: t("labels.owner"),
    probability: t("labels.probability"),
    reference: t("labels.reference"),
    residual: t("labels.residual"),
    residualAssessment: t("report.residualAssessment"),
    residualExposure: t("labels.residualExposure"),
    review: t("labels.review"),
    reviewComments: t("report.reviewComments"),
    reviewContext: t("report.reviewContext"),
    reviewDate: t("labels.reviewDate"),
    reviewType: t("labels.reviewType"),
    reviewer: t("labels.reviewer"),
    risk: t("labels.risk"),
    riskSnapshot: t("report.riskSnapshot"),
    status: t("labels.status"),
    target: t("labels.target"),
    title: t("labels.title"),
    type: t("labels.type"),
  };
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
        fontWeight: 700,
        ...getExposureStyle(value),
      }}
    >
      {value}
    </span>
  );
}

export function ExecutiveRiskLifecycleSummary({
  rows,
  labels = defaultExecutiveRiskLifecycleLabels,
}: {
  rows: ExecutiveRiskLifecycleRow[];
  labels?: ExecutiveRiskLifecycleLabels;
}) {
  return (
    <table style={tableStyle}>
      <thead>
        <tr>
          <th style={thStyle}>{labels.risk}</th>
          <th style={thStyle}>{labels.owner}</th>
          <th style={thStyle}>{labels.category}</th>
          <th style={thStyle}>{labels.exposure}</th>
          <th style={thStyle}>{labels.actions}</th>
          <th style={thStyle}>{labels.evidence}</th>
          <th style={thStyle}>{labels.residual}</th>
          <th style={thStyle}>{labels.review}</th>
          <th style={thStyle}>{labels.lifecycle}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ risk, lifecycle }) => (
          <tr key={risk.id}>
            <td style={tdStyle}>
              {lifecycle.needsManagementReview ? (
                <a
                  href={`#risk-review-${risk.id}`}
                  style={{
                    color: "#1d4ed8",
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  <strong>{risk.riskCode ?? "Risk"}</strong> {risk.title}
                </a>
              ) : (
                <>
                  <strong>{risk.riskCode ?? "Risk"}</strong> {risk.title}
                </>
              )}
            </td>
            <td style={tdStyle}>{risk.owner?.fullName ?? "-"}</td>
            <td style={tdStyle}>{risk.category?.name ?? "-"}</td>
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
            <td style={tdStyle}>{lifecycle.latestReviewOutcome ?? "-"}</td>
            <td style={tdStyle}>
              <strong
                style={{
                  color: lifecycle.needsManagementReview ? "#9a3412" : "#334155",
                }}
              >
                {lifecycle.stageLabel}
              </strong>
            </td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td style={tdStyle} colSpan={9}>
              {labels.noRiskLifecycleItems}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export function ExecutiveRiskReviewDetail({
  risk,
  reviewTypeHints = [],
  labels = defaultExecutiveRiskLifecycleLabels,
}: {
  risk: ExecutiveReportRisk;
  reviewTypeHints?: string[];
  labels?: ExecutiveRiskLifecycleLabels;
}) {
  const inherentAssessments = risk.assessments
    ?.filter((assessment) => assessment.assessmentType === "INHERENT")
    .slice()
    .sort(
      (a, b) =>
        new Date(b.assessmentDate).getTime() -
        new Date(a.assessmentDate).getTime()
    );
  const latestInherent = inherentAssessments?.[0];
  const latestResidual = risk.assessments
    ?.filter((assessment) => assessment.assessmentType === "RESIDUAL")
    .slice()
    .sort(
      (a, b) =>
        new Date(b.assessmentDate).getTime() -
        new Date(a.assessmentDate).getTime()
    )[0];
  const latestReview = risk.reviews?.[0];
  const linkedDecisions =
    latestReview?.decisionLinks?.map((link) => link.projectDecision) ?? [];
  const evidenceRecords = (risk.riskActions ?? []).flatMap((action) =>
    (action.evidenceRecords ?? []).map((evidence) => ({
      ...evidence,
      actionDescription: action.description,
    }))
  );

  return (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      <ReviewSubsection title={labels.riskSnapshot} tone="attention">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "0.5rem",
          }}
        >
          <DetailBox label={labels.risk} value={`${risk.riskCode ?? "Risk"} ${risk.title}`} />
          <DetailBox label={labels.owner} value={risk.owner?.fullName ?? "-"} />
          <DetailBox label={labels.category} value={risk.category?.name ?? "-"} />
          <DetailBox label={labels.status} value={risk.status?.name ?? "-"} />
          <DetailBox label={labels.initialExposure} value={String(risk.exposure)} />
          <DetailBox
            label={labels.residualExposure}
            value={latestResidual ? String(latestResidual.exposure) : "-"}
          />
          <DetailBox
            label={labels.target}
            value={formatDate(risk.targetResolutionDate)}
          />
          <DetailBox
            label={labels.latestReview}
            value={latestReview?.reviewOutcome?.name ?? "-"}
          />
        </div>
        <DetailText title={labels.description} value={risk.description} />
      </ReviewSubsection>

      <ReviewSubsection title={labels.assessmentBasis}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "0.75rem",
          }}
        >
          <AssessmentCard title={labels.inherentAssessment} assessment={latestInherent} labels={labels} />
          <AssessmentCard title={labels.residualAssessment} assessment={latestResidual} labels={labels} />
        </div>
      </ReviewSubsection>

      <ReviewSubsection title={labels.mitigationEvidence}>
        <DetailText title={labels.mitigationPlan} value={risk.mitigationPlan} />
        <DetailText title={labels.contingencyPlan} value={risk.contingencyPlan} />
        <table style={{ ...tableStyle, marginTop: "0.35rem" }}>
          <thead>
            <tr>
              <th style={thStyle}>{labels.action}</th>
              <th style={thStyle}>{labels.owner}</th>
              <th style={thStyle}>{labels.dueDate}</th>
              <th style={thStyle}>{labels.status}</th>
              <th style={thStyle}>{labels.evidence}</th>
            </tr>
          </thead>
          <tbody>
            {(risk.riskActions ?? []).map((action) => (
              <tr key={action.id}>
                <td style={tdStyle}>{action.description}</td>
                <td style={tdStyle}>{action.owner?.fullName ?? "-"}</td>
                <td style={tdStyle}>{formatDate(action.dueDate)}</td>
                <td style={tdStyle}>{action.statusRef?.name ?? "-"}</td>
                <td style={tdStyle}>{action.evidenceRecords?.length ?? 0}</td>
              </tr>
            ))}
            {(risk.riskActions ?? []).length === 0 && (
              <tr>
                <td style={tdStyle} colSpan={5}>
                  {labels.noMitigationActions}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div style={{ marginTop: "0.75rem" }}>
          <strong>{labels.evidenceSummary}</strong>
          <table style={{ ...tableStyle, marginTop: "0.35rem" }}>
            <thead>
              <tr>
                <th style={thStyle}>{labels.type}</th>
                <th style={thStyle}>{labels.title}</th>
                <th style={thStyle}>{labels.date}</th>
                <th style={thStyle}>{labels.reference}</th>
                <th style={thStyle}>{labels.action}</th>
              </tr>
            </thead>
            <tbody>
              {evidenceRecords.map((evidence) => (
                <tr key={evidence.id}>
                  <td style={tdStyle}>{evidence.evidenceType?.name ?? "-"}</td>
                  <td style={tdStyle}>{evidence.title}</td>
                  <td style={tdStyle}>{formatDate(evidence.evidenceDate)}</td>
                  <td style={tdStyle}>{evidence.documentReference ?? "-"}</td>
                  <td style={tdStyle}>{evidence.actionDescription}</td>
                </tr>
              ))}
              {evidenceRecords.length === 0 && (
                <tr>
                  <td style={tdStyle} colSpan={5}>
                    {labels.noStructuredEvidence}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ReviewSubsection>

      <ReviewSubsection title={labels.reviewContext}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "0.5rem",
          }}
        >
          <DetailBox
            label={labels.reviewType}
            value={latestReview?.reviewType?.name ?? "-"}
            hint={
              latestReview?.reviewType?.name
                ? undefined
                : getReviewTypeHint(reviewTypeHints, labels)
            }
          />
          <DetailBox label={labels.outcome} value={latestReview?.reviewOutcome?.name ?? "-"} />
          <DetailBox label={labels.reviewer} value={latestReview?.reviewedByUser?.fullName ?? "-"} />
          <DetailBox label={labels.reviewDate} value={formatDate(latestReview?.reviewDate)} />
        </div>
        <DetailText title={labels.reviewComments} value={latestReview?.comments} />
      </ReviewSubsection>

      <ReviewSubsection title={labels.linkedDecisions}>
        <div style={{ marginTop: "0.25rem", color: "#334155" }}>
          {linkedDecisions.length === 0
            ? labels.noLinkedDecisions
            : linkedDecisions
                .map((decision) => `${decision.decisionCode ?? "Decision"} ${decision.title}`)
                .join("; ")}
        </div>
      </ReviewSubsection>
    </div>
  );
}

function ReviewSubsection({
  title,
  children,
  tone = "default",
}: {
  title: string;
  children: ReactNode;
  tone?: "default" | "attention";
}) {
  const isAttention = tone === "attention";

  return (
    <section
      style={{
        background: isAttention ? "#fff7ed" : "#ffffff",
        borderTop: `1px solid ${isAttention ? "#fed7aa" : "#e2e8f0"}`,
        borderRight: `1px solid ${isAttention ? "#fed7aa" : "#e2e8f0"}`,
        borderBottom: `1px solid ${isAttention ? "#fed7aa" : "#e2e8f0"}`,
        borderLeft: "4px solid #fbbf24",
        borderRadius: "8px",
        padding: "0.7rem",
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: "0.68rem",
          fontWeight: 800,
          letterSpacing: "0.04em",
          marginBottom: "0.5rem",
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      {children}
    </section>
  );
}

type RiskAssessment = ExecutiveReportRisk["assessments"][number] | undefined;

function AssessmentCard({
  title,
  assessment,
  labels,
}: {
  title: string;
  assessment: RiskAssessment;
  labels: ExecutiveRiskLifecycleLabels;
}) {
  if (!assessment) {
    return (
      <div
        style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "0.6rem",
        }}
      >
        <strong>{title}</strong>
        <div style={{ color: "#64748b", marginTop: "0.35rem" }}>
          {labels.notRecorded}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        padding: "0.6rem",
      }}
    >
      <strong>{title}</strong>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "0.4rem",
          marginTop: "0.45rem",
        }}
      >
        <DetailBox label={labels.probability} value={String(assessment.probability)} />
        <DetailBox label={labels.impact} value={String(assessment.impact)} />
        <DetailBox label={labels.exposure} value={String(assessment.exposure)} />
        <DetailBox label={labels.date} value={formatDate(assessment.assessmentDate)} />
      </div>
      <div style={{ marginTop: "0.45rem", color: "#334155" }}>
        <strong>{labels.assessor}:</strong> {assessment.assessedByUser?.fullName ?? "-"}
      </div>
      <DetailText title={labels.comments} value={assessment.comments} />
    </div>
  );
}

function getReviewTypeHint(
  reviewTypeHints: string[],
  labels: ExecutiveRiskLifecycleLabels
) {
  if (reviewTypeHints.length === 0) return labels.noActiveReviewTypes;
  return `${labels.configuredTypes}: ${reviewTypeHints.join(", ")}`;
}

function DetailBox({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        padding: "0.55rem",
      }}
    >
      <div style={{ color: "#64748b", fontSize: "0.72rem", fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ color: "#0f172a", fontWeight: 700, marginTop: "0.2rem" }}>
        {value || "-"}
      </div>
      {hint && (
        <div
          style={{
            color: "#94a3b8",
            fontSize: "0.68rem",
            fontWeight: 600,
            lineHeight: 1.35,
            marginTop: "0.25rem",
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

function DetailText({
  title,
  value,
}: {
  title: string;
  value?: string | null;
}) {
  if (!value) return null;

  return (
    <div>
      <strong>{title}</strong>
      <p style={{ margin: "0.25rem 0 0", whiteSpace: "pre-wrap" }}>{value}</p>
    </div>
  );
}
