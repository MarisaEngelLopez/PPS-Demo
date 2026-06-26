import Link from "next/link";
import { ProjectProgressAssistant } from "@/components/agents/ProjectProgressAssistant";
import {
  h1Style,
  pageStyle,
  pageToggleButtonStyle,
} from "@/components/ui/layoutStyles";
import { getProjectProgressAssistantPageData } from "@/lib/domain/agents/projectProgressAssistantData";
import {
  approveProjectProgressSuggestion,
  createAccomplishmentsSuggestion,
  createEventCommandSuggestion,
  createVisibilityCleanupSuggestion,
  createWorkstreamCommandSuggestion,
  interpretProjectProgressInstruction,
  rejectProjectProgressSuggestion,
} from "../progress-assistant-actions";
import { translate } from "@/lib/i18n/dictionaries";
import { getServerLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function ProjectProgressAssistantPage() {
  const locale = await getServerLocale();
  const data = await getProjectProgressAssistantPageData();

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
        <h1 style={h1Style}>{translate(locale, "sections.progressAssistant")}</h1>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Link href="/projects" style={pageToggleButtonStyle}>
            {translate(locale, "nav.projects")}
          </Link>
          <Link
            href="/configuration/agents"
            className="mobile-hidden"
            style={pageToggleButtonStyle}
          >
            {translate(locale, "projects.agentConfiguration")}
          </Link>
          <Link
            href="/configuration/agents/transactions?agentKey=PROJECT_PROGRESS"
            className="mobile-hidden"
            style={pageToggleButtonStyle}
          >
            {translate(locale, "projects.agentLog")}
          </Link>
        </div>
      </div>

      <ProjectProgressAssistant
        projects={data.projects}
        projectWorkstreams={data.projectWorkstreams}
        projectEvents={data.projectEvents}
        suggestionRows={data.suggestionRows}
        defaultProjectId={data.defaultProjectId}
        createWorkstreamCommandSuggestion={createWorkstreamCommandSuggestion}
        createEventCommandSuggestion={createEventCommandSuggestion}
        createVisibilityCleanupSuggestion={createVisibilityCleanupSuggestion}
        createAccomplishmentsSuggestion={createAccomplishmentsSuggestion}
        interpretProjectProgressInstruction={interpretProjectProgressInstruction}
        approveProjectProgressSuggestion={approveProjectProgressSuggestion}
        rejectProjectProgressSuggestion={rejectProjectProgressSuggestion}
        voiceInputEnabled={data.voiceInputEnabled}
      />
    </main>
  );
}
