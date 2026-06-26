import { AdminCardGrid, AdminCardLink } from "@/components/ui/AdminCardLink";
import { TimeTrackingTable } from "@/components/admin/TimeTrackingTable";
import { h1Style, pageStyle } from "@/components/ui/layoutStyles";
import { getTimeTrackingBasePageData } from "@/lib/domain/agents/timeTrackingAssistantData";
import { translate } from "@/lib/i18n/dictionaries";
import { getServerLocale } from "@/lib/i18n/server";
import { createTimeEntry, deleteTimeEntry, updateTimeEntry } from "./actions";

export const dynamic = "force-dynamic";

export default async function TimeTrackingPage() {
  const locale = await getServerLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const data = await getTimeTrackingBasePageData();

  return (
    <main style={pageStyle}>
      <h1 style={h1Style}>{t("timeTracking.title")}</h1>

      <div style={{ marginBottom: 24 }}>
        <AdminCardGrid>
          <AdminCardLink
            href="/time-tracking/assistant"
            title={t("timeTracking.assistantTitle")}
            description={t("timeTracking.assistantCardDescription")}
          />
        </AdminCardGrid>
      </div>

      <TimeTrackingTable
        projects={data.projects}
        projectWorkstreams={data.projectWorkstreams}
        taskFamilies={data.taskFamilies}
        defaultTaskFamilyId={data.defaultTaskFamilyId}
        timeEntries={data.timeEntries}
        defaultProjectId={data.defaultProjectId}
        defaultProjectWorkstreamId={data.defaultProjectWorkstreamId}
        createTimeEntry={createTimeEntry}
        updateTimeEntry={updateTimeEntry}
        deleteTimeEntry={deleteTimeEntry}
      />
    </main>
  );
}
