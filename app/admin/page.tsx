import { AdminCardGrid, AdminCardLink } from "@/components/ui/AdminCardLink";
import { h1Style, pageStyle } from "@/components/ui/layoutStyles";
import { translate } from "@/lib/i18n/dictionaries";
import { getServerLocale } from "@/lib/i18n/server";

const sectionTitleStyle = {
  fontSize: 18,
  fontWeight: 600,
  marginBottom: 12,
};

export default async function AdminPage() {
  const locale = await getServerLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  return (
    <main style={pageStyle}>
      <h1 style={h1Style}>{t("pages.admin")}</h1>

      <section style={{ marginBottom: 32 }}>
        <h2 style={sectionTitleStyle}>{t("pages.projectStructure")}</h2>

        <AdminCardGrid>
          <AdminCardLink
            href="/admin/project-templates"
            title={t("admin.projectTemplates.title")}
            description={t("admin.projectTemplates.description")}
          />
          <AdminCardLink
            href="/admin/phases"
            title={t("admin.phases.title")}
            description={t("admin.phases.description")}
          />
          <AdminCardLink
            href="/admin/workstreams"
            title={t("admin.workstreams.title")}
            description={t("admin.workstreams.description")}
          />
          <AdminCardLink
            href="/admin/event-types"
            title={t("admin.events.title")}
            description={t("admin.events.description")}
          />
        </AdminCardGrid>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={sectionTitleStyle}>{t("pages.riskStructure")}</h2>

        <AdminCardGrid>
          <AdminCardLink
            href="/admin/evidence-types"
            title={t("admin.evidenceTypes.title")}
            description={t("admin.evidenceTypes.description")}
          />
        </AdminCardGrid>
      </section>

      <section>
        <h2 style={sectionTitleStyle}>{t("pages.businessAdmin")}</h2>

        <AdminCardGrid>
          <AdminCardLink
            href="/admin/task-families"
            title={t("admin.taskFamilies.title")}
            description={t("admin.taskFamilies.description")}
          />
          <AdminCardLink
            href="/admin/projectTypes"
            title={t("admin.projectTypes.title")}
            description={t("admin.projectTypes.description")}
          />
          <AdminCardLink
            href="/admin/statuses"
            title={t("admin.statuses.title")}
            description={t("admin.statuses.description")}
          />
          <AdminCardLink
            href="/admin/status-scopes"
            title={t("admin.statusScopes.title")}
            description={t("admin.statusScopes.description")}
          />
          <AdminCardLink
            href="/admin/status-usage"
            title={t("admin.statusUsage.title")}
            description={t("admin.statusUsage.description")}
          />
        </AdminCardGrid>
      </section>
    </main>
  );
}
