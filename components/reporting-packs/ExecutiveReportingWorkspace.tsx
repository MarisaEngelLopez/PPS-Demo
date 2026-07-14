"use client";

import { useState } from "react";
import { useTranslation } from "@/components/i18n/TranslationProvider";
import {
  buttonStyle,
  sectionHeaderStyle,
  sectionPanelStyle,
  sectionTitleStyle,
} from "@/components/ui/layoutStyles";
import { canCopyToNextDraft } from "@/lib/domain/reporting/reportingPackRules";
import { ReportingPackEditor } from "@/components/reporting-packs/ReportingPackEditor";
import { ReportingPackTable } from "@/components/reporting-packs/ReportingPackTable";
import type {
  ReportingPackAction,
  ReportingPackCommand,
  ReportingPackNarrativeCopyAction,
  ReportingPackSummary,
  ReportingWorkspaceProject,
  ManagedNarrativeSummary,
  NarrativeLifecycleAction,
  ReportingPackNarrativeGenerationAction,
} from "@/components/reporting-packs/types";

type ExecutiveReportingWorkspaceProps = {
  project: ReportingWorkspaceProject;
  reportingPacks: ReportingPackSummary[];
  createFirstReportingPack: ReportingPackCommand;
  createReportingPackFromLatest: ReportingPackCommand;
  updateReportingPack: ReportingPackAction;
  copyPreviousReportingPackNarrative: ReportingPackNarrativeCopyAction;
  managedNarratives: ManagedNarrativeSummary[];
  submitReportingPackNarrativeForReview: NarrativeLifecycleAction;
  reviewNarrativeProposal: NarrativeLifecycleAction;
  updateNarrativeProposal: NarrativeLifecycleAction;
  generateReportingPackNarrativeProposals: ReportingPackNarrativeGenerationAction;
  archiveReportingPack: ReportingPackCommand;
  deleteDraftReportingPack: ReportingPackCommand;
};

export function ExecutiveReportingWorkspace({
  project,
  reportingPacks,
  createFirstReportingPack,
  createReportingPackFromLatest,
  updateReportingPack,
  copyPreviousReportingPackNarrative,
  managedNarratives,
  submitReportingPackNarrativeForReview,
  reviewNarrativeProposal,
  updateNarrativeProposal,
  generateReportingPackNarrativeProposals,
  archiveReportingPack,
  deleteDraftReportingPack,
}: ExecutiveReportingWorkspaceProps) {
  const { t } = useTranslation();
  const activePacks = reportingPacks.filter((pack) => pack.isActive);
  const [selectedPackId, setSelectedPackId] = useState(
    activePacks[0]?.id ?? reportingPacks[0]?.id ?? ""
  );

  const selectedPack =
    reportingPacks.find((pack) => pack.id === selectedPackId) ?? null;
  const canCreateNextDraft = reportingPacks.some(
    (pack) => pack.isActive && canCopyToNextDraft(pack.status ?? "")
  );
  const projectLabel = project.projectCode
    ? `${project.projectCode} - ${project.name}`
    : project.name;

  return (
    <section id="executive-reporting-workspace" style={{ ...sectionPanelStyle, marginTop: "1rem" }}>
      <div style={sectionHeaderStyle}>
        <div style={{ display: "grid", gap: "0.15rem" }}>
          <div style={sectionTitleStyle}>
            {t("report.executiveReportingWorkspace")}
          </div>
          <div style={{ color: "#334155", fontSize: "0.9rem", fontWeight: 700 }}>
            {projectLabel}
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.35rem" }}>
          {reportingPacks.length === 0 ? (
            <form action={createFirstReportingPack}>
              <input type="hidden" name="projectId" value={project.id} />
              <button type="submit" style={buttonStyle}>
                {t("actions.createFirstReportingPack")}
              </button>
            </form>
          ) : (
            <form action={createReportingPackFromLatest}>
              <input type="hidden" name="projectId" value={project.id} />
              <button
                type="submit"
                disabled={!canCreateNextDraft}
                style={{
                  ...buttonStyle,
                  opacity: canCreateNextDraft ? 1 : 0.55,
                  cursor: canCreateNextDraft ? "pointer" : "not-allowed",
                }}
                title={
                  canCreateNextDraft
                    ? t("report.createNextDraftReadyHint")
                    : t("report.createNextDraftBlockedHint")
                }
              >
                {t("actions.createNextDraft")}
              </button>
            </form>
          )}
        </div>
      </div>

      {reportingPacks.length === 0 && (
        <div style={{ color: "#64748b", fontSize: "0.8rem" }}>
          {t("report.noReportingPacks")}
        </div>
      )}

      {reportingPacks.length > 0 && (
        <>
          <ReportingPackTable
            project={project}
            reportingPacks={reportingPacks}
            selectedPackId={selectedPackId}
            onSelectPack={setSelectedPackId}
            archiveReportingPack={archiveReportingPack}
            deleteDraftReportingPack={deleteDraftReportingPack}
          />

          {selectedPack && (
            <ReportingPackEditor
              key={selectedPack.id}
              project={project}
              pack={selectedPack}
              updateReportingPack={updateReportingPack}
              copyPreviousReportingPackNarrative={
                copyPreviousReportingPackNarrative
              }
              managedNarratives={managedNarratives}
              submitReportingPackNarrativeForReview={submitReportingPackNarrativeForReview}
              reviewNarrativeProposal={reviewNarrativeProposal}
              updateNarrativeProposal={updateNarrativeProposal}
              generateReportingPackNarrativeProposals={generateReportingPackNarrativeProposals}
            />
          )}
        </>
      )}
    </section>
  );
}
