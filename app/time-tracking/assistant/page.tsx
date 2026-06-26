import Link from "next/link";
import { TimeTrackingAssistant } from "@/components/agents/TimeTrackingAssistant";
import { h1Style, pageStyle, pageToggleButtonStyle } from "@/components/ui/layoutStyles";
import { getTimeTrackingAssistantPageData } from "@/lib/domain/agents/timeTrackingAssistantData";
import { translate } from "@/lib/i18n/dictionaries";
import { getServerLocale } from "@/lib/i18n/server";
import {
  approveTimeEntrySuggestion,
  cancelWorkSession,
  finishWorkSession,
  interpretTimeTrackingInstruction,
  pauseWorkSession,
  rejectTimeEntrySuggestion,
  resumeWorkSession,
  startWorkSession,
  updateWorkSessionNotes,
} from "../assistant-actions";

export const dynamic = "force-dynamic";

export default async function TimeTrackingAssistantPage() {
  const locale = await getServerLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const data = await getTimeTrackingAssistantPageData();

  return (
    <main style={pageStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <h1 style={h1Style}>{t("timeTracking.assistantTitle")}</h1>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Link
            href="/configuration/agents/transactions?agentKey=TIME_TRACKING"
            className="mobile-hidden"
            style={pageToggleButtonStyle}
          >
            {t("configuration.agentTransactions.title")}
          </Link>
          <Link href="/time-tracking" style={pageToggleButtonStyle}>
            {t("timeTracking.timeEntries")}
          </Link>
        </div>
      </div>

      <TimeTrackingAssistant
        projects={data.projects}
        projectWorkstreams={data.projectWorkstreams}
        taskFamilies={data.taskFamilies}
        defaultTaskFamilyId={data.defaultTaskFamilyId}
        defaultProjectId={data.defaultProjectId}
        defaultProjectWorkstreamId={data.defaultProjectWorkstreamId}
        workSessions={data.workSessionRows}
        suggestions={data.suggestionRows}
        instructionTemplates={data.instructionTemplateRows}
        voiceInputEnabled={data.voiceInputEnabled}
        interpretTimeTrackingInstruction={interpretTimeTrackingInstruction}
        startWorkSession={startWorkSession}
        pauseWorkSession={pauseWorkSession}
        resumeWorkSession={resumeWorkSession}
        finishWorkSession={finishWorkSession}
        cancelWorkSession={cancelWorkSession}
        updateWorkSessionNotes={updateWorkSessionNotes}
        approveTimeEntrySuggestion={approveTimeEntrySuggestion}
        rejectTimeEntrySuggestion={rejectTimeEntrySuggestion}
      />
    </main>
  );
}
