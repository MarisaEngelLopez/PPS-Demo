import { revalidatePath } from "next/cache";
import {
  h1Style,
  pageStyle,
  tableButtonStyle,
} from "@/components/ui/layoutStyles";
import { tableStyle, tdStyle, thStyle } from "@/components/ui/tableStyles";
import { prisma } from "@/lib/prisma";
import { translate } from "@/lib/i18n/dictionaries";
import { getServerLocale } from "@/lib/i18n/server";
import {
  REPORTING_PACK_STATUSES,
  normalizeReportingPackStatus,
} from "@/lib/domain/reporting/reportingPackRules";
import { getReportingPacksForAdmin } from "@/lib/domain/reporting/reportingPackQueries";
import { translateReportingPackStatus } from "@/lib/i18n/displayTranslations";

function formatDate(value?: Date | string | null) {
  if (!value) return "-";
  return new Date(value).toISOString().slice(0, 10);
}

async function updateReportingPackStatus(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const projectId = String(formData.get("projectId") || "");
  const status = normalizeReportingPackStatus(
    String(formData.get("status") || "DRAFT")
  );

  if (!id || !projectId) return;

  await prisma.projectReportingPack.update({
    where: { id },
    data: {
      status,
      isActive: status !== "ARCHIVED",
    },
  });

  revalidatePath("/configuration/reporting-packs");
  revalidatePath("/admin/configuration/reporting-packs");
  revalidatePath("/admin/reporting-packs");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/executive-report");
}

export default async function ReportingPacksConfigurationPage() {
  const locale = await getServerLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const reportingPacks = await getReportingPacksForAdmin();

  return (
    <main style={pageStyle}>
      <h1 style={h1Style}>{t("configuration.reportingPacks.title")}</h1>

      <p style={{ color: "#475569", maxWidth: 920 }}>
        {t("configuration.reportingPacks.description")}
      </p>

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>{t("labels.project")}</th>
            <th style={thStyle}>{t("labels.version")}</th>
            <th style={thStyle}>{t("table.date")}</th>
            <th style={thStyle}>{t("labels.status")}</th>
            <th style={thStyle}>{t("labels.title")}</th>
            <th style={thStyle}>{t("configuration.reportingPacks.statusOverride")}</th>
          </tr>
        </thead>
        <tbody>
          {reportingPacks.map((pack) => (
            <tr key={pack.id}>
              <td style={tdStyle}>
                {pack.project.projectCode} - {pack.project.name}
              </td>
              <td style={tdStyle}>v{pack.version}</td>
              <td style={tdStyle}>{formatDate(pack.reportingDate)}</td>
              <td style={tdStyle}>{translateReportingPackStatus(pack.status, t)}</td>
              <td style={tdStyle}>{pack.title}</td>
              <td style={tdStyle}>
                <form
                  action={updateReportingPackStatus}
                  style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}
                >
                  <input type="hidden" name="id" value={pack.id} />
                  <input type="hidden" name="projectId" value={pack.projectId} />
                  <select
                    name="status"
                    defaultValue={pack.status}
                    style={{
                      fontSize: "0.75rem",
                      padding: "0.2rem 0.3rem",
                    }}
                  >
                    {REPORTING_PACK_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {translateReportingPackStatus(status, t)}
                      </option>
                    ))}
                  </select>
                  <button type="submit" style={tableButtonStyle}>
                    {t("actions.apply")}
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
