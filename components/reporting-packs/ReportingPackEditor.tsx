"use client";

import { TranslatedButtonLabel } from "@/components/ui/TranslatedControls";
import { useState, type FormEvent } from "react";
import { useTranslation } from "@/components/i18n/TranslationProvider";
import { useActionToast } from "@/components/ui/useActionToast";
import {
  buttonStyle,
  compactInputStyle,
  labelStyle,
  sectionPanelStyle,
} from "@/components/ui/layoutStyles";
import {
  REPORTING_PACK_STATUSES,
  isReportingPackLocked,
} from "@/lib/domain/reporting/reportingPackRules";
import { NarrativeField } from "@/components/reporting-packs/NarrativeField";
import type {
  ReportingPackAction,
  ReportingPackSummary,
  ReportingWorkspaceProject,
} from "@/components/reporting-packs/types";
import { toDateInputValue } from "@/components/reporting-packs/types";

type ReportingPackEditorProps = {
  project: ReportingWorkspaceProject;
  pack: ReportingPackSummary;
  updateReportingPack: ReportingPackAction;
};

export function ReportingPackEditor({
  project,
  pack,
  updateReportingPack,
}: ReportingPackEditorProps) {
  const { t } = useTranslation();
  const isReadOnly = isReportingPackLocked(pack.status ?? "");
  const [title, setTitle] = useState(pack.title ?? "");
  const [reportingDate, setReportingDate] = useState(
    toDateInputValue(pack.reportingDate)
  );
  const [reportingPeriod, setReportingPeriod] = useState(
    pack.reportingPeriod ?? ""
  );
  const [status, setStatus] = useState(pack.status ?? "DRAFT");
  const [reportIndex, setReportIndex] = useState(pack.reportIndex ?? "");
  const [executiveSummary, setExecutiveSummary] = useState(
    pack.executiveSummary ?? ""
  );
  const [achievements, setAchievements] = useState(pack.achievements ?? "");
  const [issues, setIssues] = useState(pack.issues ?? "");
  const [nextSteps, setNextSteps] = useState(pack.nextSteps ?? "");
  const [managementAsk, setManagementAsk] = useState(pack.managementAsk ?? "");
  const [conclusion, setConclusion] = useState(pack.conclusion ?? "");
  const { handleAction } = useActionToast();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    await handleAction(updateReportingPack, formData);
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        marginTop: "1rem",
        background: "#f8fafc",
        padding: "0.75rem",
        borderRadius: "8px",
        border: "1px solid #e2e8f0",
      }}
    >
      <input type="hidden" name="id" value={pack.id} />
      <input type="hidden" name="projectId" value={project.id} />

      {isReadOnly && (
        <div
          style={{
            ...sectionPanelStyle,
            marginBottom: "0.75rem",
            background: "#eff6ff",
            color: "#1e3a8a",
            fontSize: "0.82rem",
            fontWeight: 600,
          }}
        >
          {t("report.readOnlyPackMessage")}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "120px 1fr 120px 1fr",
          gap: "0.5rem 0.75rem",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <div style={labelStyle}>{t("labels.title")}</div>
        <input
          name="title"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={isReadOnly}
          style={compactInputStyle}
        />

        <div style={labelStyle}>{t("labels.status")}</div>
        <select
          name="status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          disabled={isReadOnly}
          style={compactInputStyle}
        >
          {REPORTING_PACK_STATUSES.map((statusOption) => (
            <option key={statusOption} value={statusOption}>
              {statusOption}
            </option>
          ))}
        </select>

        <div style={labelStyle}>{t("labels.reportingDate")}</div>
        <input
          type="date"
          name="reportingDate"
          value={reportingDate}
          onChange={(event) => setReportingDate(event.target.value)}
          disabled={isReadOnly}
          style={compactInputStyle}
        />

        <div style={labelStyle}>{t("labels.reportingPeriod")}</div>
        <input
          name="reportingPeriod"
          value={reportingPeriod}
          onChange={(event) => setReportingPeriod(event.target.value)}
          disabled={isReadOnly}
          placeholder="May 2026 / Week 21 / Steering Committee"
          style={compactInputStyle}
        />
      </div>

      <NarrativeField
        label={t("report.indexDeckStructure")}
        name="reportIndex"
        value={reportIndex}
        onChange={setReportIndex}
        disabled={isReadOnly}
        placeholder={
          "1. Executive Summary\n2. Achievements\n3. Issues / Concerns\n4. Risks\n5. Milestones / Timeline\n6. Next Steps\n7. Management Ask\n8. Conclusion"
        }
      />

      <NarrativeField
        label={t("report.executiveSummary")}
        name="executiveSummary"
        value={executiveSummary}
        onChange={setExecutiveSummary}
        disabled={isReadOnly}
        placeholder={"Overall status narrative.\nKey message for executive audience."}
      />

      <NarrativeField
        label={t("report.achievements")}
        name="achievements"
        value={achievements}
        onChange={setAchievements}
        disabled={isReadOnly}
        placeholder={
          "- Completed phase 1 deployment\n- Stabilized reporting cadence\n- Confirmed client governance model"
        }
      />

      <NarrativeField
        label={t("report.issuesConcerns")}
        name="issues"
        value={issues}
        onChange={setIssues}
        disabled={isReadOnly}
        placeholder={
          "- Resource bottleneck in testing\n- Pending client decision on scope\n- Dependency on infrastructure readiness"
        }
      />

      <NarrativeField
        label={t("report.nextSteps")}
        name="nextSteps"
        value={nextSteps}
        onChange={setNextSteps}
        disabled={isReadOnly}
        placeholder={
          "- Complete UAT preparation\n- Finalize milestone baseline\n- Confirm steering committee inputs"
        }
      />

      <NarrativeField
        label={t("report.managementAsk")}
        name="managementAsk"
        value={managementAsk}
        onChange={setManagementAsk}
        disabled={isReadOnly}
        placeholder={
          "- Decision required on budget extension\n- Escalation support with client sponsor\n- Approval for additional resources"
        }
      />

      <NarrativeField
        label={t("report.conclusion")}
        name="conclusion"
        value={conclusion}
        onChange={setConclusion}
        disabled={isReadOnly}
        placeholder={"Final executive takeaway, delivery outlook, or confidence statement."}
      />

      {!isReadOnly && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" style={buttonStyle}>
            <TranslatedButtonLabel labelKey="actions.saveReportingPack" />
          </button>
        </div>
      )}
    </form>
  );
}
