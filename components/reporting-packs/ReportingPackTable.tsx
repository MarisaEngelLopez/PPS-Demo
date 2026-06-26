"use client";

import { TranslatedButtonLabel } from "@/components/ui/TranslatedControls";
import { useTranslation } from "@/components/i18n/TranslationProvider";
import { tableButtonStyle } from "@/components/ui/layoutStyles";
import { tableStyle, tdStyle, thStyle } from "@/components/ui/tableStyles";
import { canDeleteReportingPack } from "@/lib/domain/reporting/reportingPackRules";
import type {
  ReportingPackCommand,
  ReportingPackSummary,
  ReportingWorkspaceProject,
} from "@/components/reporting-packs/types";
import { toDateInputValue } from "@/components/reporting-packs/types";

type ReportingPackTableProps = {
  project: ReportingWorkspaceProject;
  reportingPacks: ReportingPackSummary[];
  selectedPackId: string;
  onSelectPack: (packId: string) => void;
  archiveReportingPack: ReportingPackCommand;
  deleteDraftReportingPack: ReportingPackCommand;
};

export function ReportingPackTable({
  project,
  reportingPacks,
  selectedPackId,
  onSelectPack,
  archiveReportingPack,
  deleteDraftReportingPack,
}: ReportingPackTableProps) {
  const { t } = useTranslation();

  return (
    <table style={tableStyle}>
      <thead>
        <tr>
          <th style={thStyle}>{t("labels.version")}</th>
          <th style={thStyle}>{t("table.date")}</th>
          <th style={thStyle}>{t("labels.reportingPeriod")}</th>
          <th style={thStyle}>{t("labels.status")}</th>
          <th style={thStyle}>{t("labels.title")}</th>
          <th style={thStyle}>{t("table.action")}</th>
        </tr>
      </thead>

      <tbody>
        {reportingPacks.map((pack) => (
          <tr key={pack.id}>
            <td style={tdStyle}>v{pack.version}</td>
            <td style={tdStyle}>{toDateInputValue(pack.reportingDate)}</td>
            <td style={tdStyle}>{pack.reportingPeriod || "-"}</td>
            <td style={tdStyle}>{pack.status}</td>
            <td style={tdStyle}>{pack.title}</td>
            <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
              <div style={{ display: "flex", gap: "0.25rem" }}>
                <button
                  type="button"
                  style={{
                    ...tableButtonStyle,
                    fontWeight: selectedPackId === pack.id ? 700 : 400,
                  }}
                  onClick={() => onSelectPack(pack.id)}
                >
                  <TranslatedButtonLabel labelKey="actions.edit" />
                </button>

                {pack.isActive && (
                  <form action={archiveReportingPack} style={{ margin: 0 }}>
                    <input type="hidden" name="id" value={pack.id} />
                    <input type="hidden" name="projectId" value={project.id} />
                    <button type="submit" style={tableButtonStyle}>
                      <TranslatedButtonLabel labelKey="actions.archive" />
                    </button>
                  </form>
                )}

                {canDeleteReportingPack(pack.status) && (
                  <form action={deleteDraftReportingPack} style={{ margin: 0 }}>
                    <input type="hidden" name="id" value={pack.id} />
                    <input type="hidden" name="projectId" value={project.id} />
                    <button
                      type="submit"
                      style={{
                        ...tableButtonStyle,
                        borderColor: "#fecaca",
                        color: "#991b1b",
                      }}
                      title="Permanently delete this draft so the version number can be reused."
                    >
                      <TranslatedButtonLabel labelKey="actions.deleteDraft" />
                    </button>
                  </form>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
