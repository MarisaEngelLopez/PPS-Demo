"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "@/components/i18n/TranslationProvider";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { OperationalActionCard } from "@/components/agents/OperationalActionCard";
import { VoiceInputControl } from "@/components/agents/VoiceInputControl";
import { detectVoiceCommandIntent } from "@/components/agents/voiceCommandIntents";
import {
  speakVoiceConfirmation,
  speakVoiceConfirmationSegments,
  type VoiceConfirmationSegment,
} from "@/components/agents/voiceConfirmation";
import {
  compactInputStyle,
  inputStyle,
  pageToggleButtonStyle,
  tableActionGroupStyle,
  tableButtonStyle,
} from "@/components/ui/layoutStyles";
import { useActionToast } from "@/components/ui/useActionToast";
import {
  getVisibilityOptions,
  translateVisibility,
} from "@/lib/i18n/displayTranslations";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

type ActionResult = { ok: boolean; message: string };
type AssistantAction = (formData: FormData) => Promise<ActionResult | undefined>;
type InterpretationAction = (
  formData: FormData
) => Promise<
  | (ActionResult & {
      interpretation?: ProgressInterpretation;
    })
  | undefined
>;

type ProjectOption = { id: string; projectCode: string; name: string };
type WorkstreamOption = {
  id: string;
  projectId: string;
  label: string;
  actualStartDate: string;
  actualEndDate: string;
  visibility: string;
};
type EventOption = {
  id: string;
  projectId: string;
  label: string;
  eventDate: string;
  completionDate: string;
  isCompleted: boolean;
  visibility: string;
};
type SuggestionRow = {
  id: string;
  title: string;
  summary: string;
  command: string;
  projectId: string;
  targetEntity: string;
  targetRecordId: string;
  project: string;
  target: string;
  date: string;
  visibility: string;
  items: {
    targetEntity: string;
    targetRecordId: string;
    label: string;
    fromVisibility?: string | null;
    toVisibility?: string | null;
  }[];
  accomplishments: {
    sinceDate?: string;
    sourceReportingPackVersion?: string;
    workstreams?: string[];
    events?: string[];
    risks?: string[];
    riskActions?: string[];
    decisions?: string[];
  } | null;
};

type ProgressInterpretation = {
  command: string;
  targetType: "WORKSTREAM" | "EVENT" | null;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  rawInstruction: string;
  understoodText: string;
  clarification?: string | null;
  projectId?: string;
  projectLabel?: string;
  targetId?: string;
  targetLabel?: string;
  date?: string | null;
  visibility?: string | null;
  sourceType?: "TEXT" | "VOICE";
  candidates?: {
    workstreams?: { id: string; label: string; score: number }[];
    events?: { id: string; label: string; score: number }[];
  };
};

type AssistantTab = "CREATE" | "REVIEW";

const workstreamCommands: [string, TranslationKey][] = [
  ["START_WORKSTREAM", "projects.command.startWorkstream"],
  ["FINISH_WORKSTREAM", "projects.command.finishWorkstream"],
  ["REOPEN_WORKSTREAM", "projects.command.reopenWorkstream"],
  ["CHANGE_WORKSTREAM_VISIBILITY", "projects.command.changeVisibility"],
];

const eventCommands = [
  ["COMPLETE_EVENT", "Complete milestone"],
  ["REOPEN_EVENT", "Reopen milestone"],
  ["CHANGE_EVENT_VISIBILITY", "Change visibility"],
];

function getClientTimestamp() {
  return new Date().toISOString();
}

function today() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function AccomplishmentList({
  title,
  items,
}: {
  title: string;
  items?: string[];
}) {
  if (!items?.length) return null;

  return (
    <div style={{ marginTop: "0.35rem" }}>
      <strong>{title}</strong>
      <ul style={{ margin: "0.2rem 0 0", paddingLeft: "1.1rem" }}>
        {items.map((item) => (
          <li key={`${title}-${item}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function isWorkstreamCommand(command: string) {
  return [
    "START_WORKSTREAM",
    "FINISH_WORKSTREAM",
    "REOPEN_WORKSTREAM",
    "CHANGE_WORKSTREAM_VISIBILITY",
  ].includes(command);
}

function isEventCommand(command: string) {
  return ["COMPLETE_EVENT", "REOPEN_EVENT", "CHANGE_EVENT_VISIBILITY"].includes(command);
}

function projectProgressVoiceConfirmationSegments(
  interpretation: ProgressInterpretation,
  locale: ReturnType<typeof useTranslation>["locale"]
): VoiceConfirmationSegment[] {
  if (locale !== "es") {
    return [{ text: interpretation.understoodText || interpretation.clarification || "" }];
  }

  const action: Record<string, string> = {
    START_WORKSTREAM: "iniciar",
    FINISH_WORKSTREAM: "finalizar",
    REOPEN_WORKSTREAM: "reabrir",
    CHANGE_WORKSTREAM_VISIBILITY: "cambiar la visibilidad de",
    COMPLETE_EVENT: "completar",
    REOPEN_EVENT: "reabrir",
    CHANGE_EVENT_VISIBILITY: "cambiar la visibilidad de",
  };
  const target = interpretation.targetType === "EVENT" ? "hito" : "actividad";
  const dateText = interpretation.date ? `. Fecha ${interpretation.date}` : "";
  const visibilityText = interpretation.visibility
    ? `. Visibilidad ${interpretation.visibility}`
    : "";

  return [
    {
      text: `Entendido. Crear sugerencia para ${action[interpretation.command] ?? "actualizar"} ${target} en `,
      locale: "es",
    },
    { text: interpretation.projectLabel ?? "", locale: "en" },
    { text: ". ", locale: "es" },
    { text: interpretation.targetLabel ?? "", locale: "en" },
    { text: `${dateText}${visibilityText}. ¿Crear sugerencia?`, locale: "es" },
  ];
}

const pendingActionButtonStyle = {
  ...tableButtonStyle,
  minHeight: "44px",
  padding: "0.7rem 1rem",
  fontSize: "0.95rem",
};

const pendingSecondaryButtonStyle = {
  ...pendingActionButtonStyle,
  background: "#ffffff",
  color: "#334155",
  border: "1px solid #cbd5e1",
};

export function ProjectProgressAssistant({
  projects,
  projectWorkstreams,
  projectEvents,
  suggestionRows,
  defaultProjectId,
  createWorkstreamCommandSuggestion,
  createEventCommandSuggestion,
  createVisibilityCleanupSuggestion,
  createAccomplishmentsSuggestion,
  interpretProjectProgressInstruction,
  approveProjectProgressSuggestion,
  rejectProjectProgressSuggestion,
  voiceInputEnabled,
}: {
  projects: ProjectOption[];
  projectWorkstreams: WorkstreamOption[];
  projectEvents: EventOption[];
  suggestionRows: SuggestionRow[];
  defaultProjectId: string;
  createWorkstreamCommandSuggestion: AssistantAction;
  createEventCommandSuggestion: AssistantAction;
  createVisibilityCleanupSuggestion: AssistantAction;
  createAccomplishmentsSuggestion: AssistantAction;
  interpretProjectProgressInstruction: InterpretationAction;
  approveProjectProgressSuggestion: AssistantAction;
  rejectProjectProgressSuggestion: AssistantAction;
  voiceInputEnabled: boolean;
}) {
  const { handleAction } = useActionToast();
  const { t, locale } = useTranslation();
  const visibilityOptions = getVisibilityOptions(t);
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [workstreamCommand, setWorkstreamCommand] = useState("START_WORKSTREAM");
  const [eventCommand, setEventCommand] = useState("COMPLETE_EVENT");
  const [naturalInstruction, setNaturalInstruction] = useState("");
  const [naturalInstructionSource, setNaturalInstructionSource] =
    useState<"TEXT" | "VOICE">("TEXT");
  const [interpretation, setInterpretation] =
    useState<ProgressInterpretation | null>(null);
  const [interpretationMessage, setInterpretationMessage] = useState("");
  const [confirmedTargetId, setConfirmedTargetId] = useState("");
  const [activeTab, setActiveTab] = useState<AssistantTab>("CREATE");
  const tabLabels: Record<AssistantTab, string> = {
    CREATE:
      t("projects.createSuggestionTab") === "projects.createSuggestionTab"
        ? "Create Suggestion"
        : t("projects.createSuggestionTab"),
    REVIEW:
      t("projects.reviewSuggestionsTab") === "projects.reviewSuggestionsTab"
        ? "Review Suggestions"
        : t("projects.reviewSuggestionsTab"),
  };

  const workstreams = useMemo(
    () => projectWorkstreams.filter((workstream) => workstream.projectId === projectId),
    [projectWorkstreams, projectId]
  );
  const events = useMemo(
    () => projectEvents.filter((event) => event.projectId === projectId),
    [projectEvents, projectId]
  );

  function clearNaturalLanguageState() {
    setInterpretation(null);
    setInterpretationMessage("");
    setNaturalInstruction("");
    setConfirmedTargetId("");
  }

  async function applyPendingInterpretation(pending = interpretation) {
    if (!pending?.projectId || !confirmedTargetId) return false;

    const formData = new FormData();
    formData.set("projectId", pending.projectId);
    formData.set("command", pending.command);
    formData.set("date", pending.date ?? "");
    formData.set("visibility", pending.visibility ?? "DETAILED");
    formData.set("rawInstruction", pending.rawInstruction);
    formData.set("sourceType", naturalInstructionSource);
    formData.set("clientTimestamp", getClientTimestamp());
    formData.set(
      "interpretationCorrection",
      confirmedTargetId !== pending.targetId
        ? `Target corrected from ${pending.targetLabel} to ${selectedTargetLabel()}`
        : ""
    );

    if (pending.targetType === "WORKSTREAM") {
      formData.set("projectWorkstreamId", confirmedTargetId);
      await handleAction(createWorkstreamCommandSuggestion, formData);
      clearNaturalLanguageState();
      return true;
    }

    if (pending.targetType === "EVENT") {
      formData.set("eventId", confirmedTargetId);
      await handleAction(createEventCommandSuggestion, formData);
      clearNaturalLanguageState();
      return true;
    }

    return false;
  }

  function repeatPendingConfirmation() {
    if (!interpretation) return;

    speakVoiceConfirmationSegments(
      projectProgressVoiceConfirmationSegments(interpretation, locale),
      locale
    );
  }

  async function handlePendingVoiceConfirmation(transcript: string) {
    const commandIntent = detectVoiceCommandIntent(transcript);
    if (commandIntent === "APPLY") {
      const applied = await applyPendingInterpretation();
      speakVoiceConfirmation(
        applied
          ? locale === "es"
            ? "Sugerencia creada."
            : "Suggestion created."
          : locale === "es"
            ? "No hay una sugerencia pendiente para crear."
            : "There is no pending suggestion to create.",
        locale
      );
      return;
    }

    if (commandIntent === "CANCEL") {
      clearNaturalLanguageState();
      speakVoiceConfirmation(locale === "es" ? "Cancelado." : "Cancelled.", locale);
      return;
    }

    speakVoiceConfirmation(
      locale === "es"
        ? "No he entendido la confirmación."
        : "I did not understand the confirmation.",
      locale
    );
  }

  function renderPendingVoiceControls() {
    return (
      <>
        <button
          type="button"
          onClick={repeatPendingConfirmation}
          style={pendingSecondaryButtonStyle}
        >
          {locale === "es" ? "Repetir confirmación" : "Repeat confirmation"}
        </button>
        <VoiceInputControl
          enabled={voiceInputEnabled}
          onStart={() => {
            setNaturalInstruction("");
            setNaturalInstructionSource("VOICE");
          }}
          onTranscript={(transcript) => {
            setNaturalInstruction(transcript);
            setNaturalInstructionSource("VOICE");
          }}
          onInstructionEnd={(transcript) => {
            setNaturalInstruction(transcript);
            setNaturalInstructionSource("VOICE");
            void handlePendingVoiceConfirmation(transcript);
          }}
        />
        <button
          type="button"
          onClick={() => {
            clearNaturalLanguageState();
            speakVoiceConfirmation(locale === "es" ? "Cancelado." : "Cancelled.", locale);
          }}
          style={pendingSecondaryButtonStyle}
        >
          {t("actions.cancel")}
        </button>
      </>
    );
  }

  async function interpretNaturalInstruction(
    rawInstruction = naturalInstruction,
    sourceType: "TEXT" | "VOICE" = naturalInstructionSource
  ) {
    if (sourceType === "VOICE") {
      const commandIntent = detectVoiceCommandIntent(rawInstruction);
      if (commandIntent === "APPLY") {
        const applied = await applyPendingInterpretation();
        speakVoiceConfirmation(
          applied
            ? locale === "es"
              ? "Sugerencia creada."
              : "Suggestion created."
            : locale === "es"
              ? "No hay una sugerencia pendiente para crear."
              : "There is no pending suggestion to create.",
          locale
        );
        return;
      }
      if (commandIntent === "CANCEL") {
        clearNaturalLanguageState();
        speakVoiceConfirmation(locale === "es" ? "Cancelado." : "Cancelled.", locale);
        return;
      }
    }

    const formData = new FormData();
    formData.set("rawInstruction", rawInstruction);
    formData.set("projectId", projectId);
    formData.set("sourceType", sourceType);
    formData.set("clientTimestamp", getClientTimestamp());
    formData.set("date", today());

    const result = await interpretProjectProgressInstruction(formData);
    setInterpretationMessage(result?.message ?? "");
    setInterpretation(result?.interpretation ?? null);
    if (result?.interpretation?.projectId) {
      setProjectId(result.interpretation.projectId);
    }
    setConfirmedTargetId(result?.interpretation?.targetId ?? "");
    if (sourceType === "VOICE" && result?.interpretation) {
      speakVoiceConfirmationSegments(
        projectProgressVoiceConfirmationSegments(result.interpretation, locale),
        locale
      );
    } else if (sourceType === "VOICE") {
      speakVoiceConfirmation(result?.message || "", locale);
    }
  }

  function selectedTargetLabel() {
    if (!interpretation) return "";
    const candidates =
      interpretation.targetType === "EVENT"
        ? interpretation.candidates?.events
        : interpretation.candidates?.workstreams;
    return candidates?.find((candidate) => candidate.id === confirmedTargetId)?.label ?? "";
  }

  return (
    <>
      <div className="assistant-form-grid" style={{ display: "grid", gap: "0.5rem", maxWidth: 760 }}>
        <label>
          {t("labels.project")}
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)} style={inputStyle}>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.projectCode} - {project.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", margin: "1rem 0" }}>
        {[
          ["CREATE", tabLabels.CREATE],
          ["REVIEW", tabLabels.REVIEW],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setActiveTab(value as AssistantTab)}
            style={{
              ...pageToggleButtonStyle,
              background: activeTab === value ? "#111827" : "#ffffff",
              color: activeTab === value ? "#ffffff" : "#111827",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "CREATE" && (
        <>
      <SectionHeader title={t("timeTracking.naturalLanguagePilot")} />
      <form
        action={async (formData) => {
          await interpretNaturalInstruction(
            String(formData.get("rawInstruction") ?? ""),
            naturalInstructionSource
          );
        }}
        style={{
          display: "grid",
          gap: "0.5rem",
          maxWidth: 760,
          marginBottom: "0.75rem",
        }}
      >
        <label>
          {t("timeTracking.instruction")}
          <input
            name="rawInstruction"
            value={naturalInstruction}
            onChange={(event) => {
              setNaturalInstruction(event.target.value);
              setNaturalInstructionSource("TEXT");
            }}
            placeholder={t("projects.progressInstructionPlaceholder")}
            style={inputStyle}
          />
        </label>
        <div style={tableActionGroupStyle}>
          <VoiceInputControl
            enabled={voiceInputEnabled}
            onStart={() => {
              clearNaturalLanguageState();
              setNaturalInstructionSource("VOICE");
            }}
            onTranscript={(transcript) => {
              setNaturalInstruction(transcript);
              setNaturalInstructionSource("VOICE");
            }}
            onInstructionEnd={(transcript) => {
              setNaturalInstruction(transcript);
              setNaturalInstructionSource("VOICE");
              void interpretNaturalInstruction(transcript, "VOICE");
            }}
          />
          <button type="submit" style={tableButtonStyle}>
            {t("actions.interpret")}
          </button>
        </div>
      </form>

      {interpretationMessage && (
        <div
          style={{
            maxWidth: 760,
            marginBottom: "0.75rem",
            padding: "0.55rem 0.65rem",
            border: "1px solid #dbeafe",
            borderRadius: "8px",
            background: "#eff6ff",
            color: "#1e3a8a",
            fontSize: "0.82rem",
          }}
        >
          {interpretationMessage}
        </div>
      )}

      {interpretation && (
        <div
          style={{
            maxWidth: 760,
            marginBottom: "1rem",
            padding: "0.75rem",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            background: "#ffffff",
          }}
        >
          <div style={{ fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
            {t("timeTracking.confidence")}: {interpretation.confidence}
          </div>
          <div style={{ color: "#111827", marginBottom: "0.35rem" }}>
            {interpretation.understoodText || interpretation.clarification}
          </div>
          {interpretation.targetType && (
            <label
              style={{
                display: "block",
                color: "#475569",
                fontSize: "0.82rem",
                marginBottom: "0.6rem",
              }}
            >
              {t("timeTracking.correctMatch")}
              <select
                value={confirmedTargetId}
                onChange={(event) => setConfirmedTargetId(event.target.value)}
                style={{ ...inputStyle, marginTop: "0.25rem" }}
              >
                {(interpretation.targetType === "EVENT"
                  ? interpretation.candidates?.events
                  : interpretation.candidates?.workstreams
                )?.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {interpretation.clarification && (
            <div style={{ color: "#64748b", marginBottom: "0.5rem" }}>
              {interpretation.clarification}
            </div>
          )}
          {interpretation.targetType === "WORKSTREAM" &&
            interpretation.projectId &&
            confirmedTargetId && (
              <form
                action={async (formData) => {
                  formData.set("clientTimestamp", getClientTimestamp());
                  await handleAction(createWorkstreamCommandSuggestion, formData);
                  clearNaturalLanguageState();
                }}
              >
                <input type="hidden" name="projectId" value={interpretation.projectId} />
                <input type="hidden" name="command" value={interpretation.command} />
                <input
                  type="hidden"
                  name="projectWorkstreamId"
                  value={confirmedTargetId}
                />
                <input type="hidden" name="date" value={interpretation.date ?? ""} />
                <input
                  type="hidden"
                  name="visibility"
                  value={interpretation.visibility ?? "DETAILED"}
                />
                <input
                  type="hidden"
                  name="rawInstruction"
                  value={interpretation.rawInstruction}
                />
                <input type="hidden" name="sourceType" value={naturalInstructionSource} />
                <input
                  type="hidden"
                  name="interpretationCorrection"
                  value={
                    confirmedTargetId !== interpretation.targetId
                      ? `Target corrected from ${interpretation.targetLabel} to ${selectedTargetLabel()}`
                      : ""
                  }
                />
                <div style={{ ...tableActionGroupStyle, marginTop: "0.65rem" }}>
                  <button
                    type="submit"
                    disabled={!confirmedTargetId}
                    style={{ ...pendingActionButtonStyle, opacity: !confirmedTargetId ? 0.55 : 1 }}
                  >
                    {t("actions.createSuggestion")}
                  </button>
                  {renderPendingVoiceControls()}
                </div>
              </form>
            )}
          {interpretation.targetType === "EVENT" &&
            interpretation.projectId &&
            confirmedTargetId && (
              <form
                action={async (formData) => {
                  formData.set("clientTimestamp", getClientTimestamp());
                  await handleAction(createEventCommandSuggestion, formData);
                  clearNaturalLanguageState();
                }}
              >
                <input type="hidden" name="projectId" value={interpretation.projectId} />
                <input type="hidden" name="command" value={interpretation.command} />
                <input type="hidden" name="eventId" value={confirmedTargetId} />
                <input type="hidden" name="date" value={interpretation.date ?? ""} />
                <input
                  type="hidden"
                  name="visibility"
                  value={interpretation.visibility ?? "DETAILED"}
                />
                <input
                  type="hidden"
                  name="rawInstruction"
                  value={interpretation.rawInstruction}
                />
                <input type="hidden" name="sourceType" value={naturalInstructionSource} />
                <input
                  type="hidden"
                  name="interpretationCorrection"
                  value={
                    confirmedTargetId !== interpretation.targetId
                      ? `Target corrected from ${interpretation.targetLabel} to ${selectedTargetLabel()}`
                      : ""
                  }
                />
                <div style={{ ...tableActionGroupStyle, marginTop: "0.65rem" }}>
                  <button
                    type="submit"
                    disabled={!confirmedTargetId}
                    style={{ ...pendingActionButtonStyle, opacity: !confirmedTargetId ? 0.55 : 1 }}
                  >
                    {t("actions.createSuggestion")}
                  </button>
                  {renderPendingVoiceControls()}
                </div>
              </form>
            )}
        </div>
      )}

      <SectionHeader title={t("projects.workstreamCommands")} />
      <form
        className="assistant-form-grid"
        action={async (formData) => {
          formData.set("projectId", projectId);
          formData.set("clientTimestamp", getClientTimestamp());
          await handleAction(createWorkstreamCommandSuggestion, formData);
        }}
        style={{ display: "grid", gap: "0.5rem", alignItems: "end", maxWidth: 760, marginBottom: "1rem" }}
      >
        <label>
          {t("labels.command")}
          <select name="command" value={workstreamCommand} onChange={(event) => setWorkstreamCommand(event.target.value)} style={inputStyle}>
            {workstreamCommands.map(([value, labelKey]) => (
              <option key={value} value={value}>{t(labelKey)}</option>
            ))}
          </select>
        </label>
        <label>
          {t("labels.workstream")}
          <select name="projectWorkstreamId" required style={inputStyle}>
            {workstreams.map((workstream) => (
              <option key={workstream.id} value={workstream.id}>{workstream.label}</option>
            ))}
          </select>
        </label>
        {!["REOPEN_WORKSTREAM", "CHANGE_WORKSTREAM_VISIBILITY"].includes(workstreamCommand) && (
          <label>
            {t("table.date")}
            <input name="date" type="date" defaultValue={today()} style={inputStyle} />
          </label>
        )}
        {workstreamCommand === "CHANGE_WORKSTREAM_VISIBILITY" && (
          <label>
            {t("labels.visibility")}
            <select name="visibility" defaultValue="DETAILED" style={inputStyle}>
              {visibilityOptions.map((visibility) => (
                <option key={visibility.value} value={visibility.value}>
                  {visibility.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="submit" style={tableButtonStyle}>{t("actions.createSuggestion")}</button>
      </form>

      <SectionHeader title={t("projects.milestoneCommands")} />
      <form
        className="assistant-form-grid"
        action={async (formData) => {
          formData.set("projectId", projectId);
          formData.set("clientTimestamp", getClientTimestamp());
          await handleAction(createEventCommandSuggestion, formData);
        }}
        style={{ display: "grid", gap: "0.5rem", alignItems: "end", maxWidth: 760, marginBottom: "1rem" }}
      >
        <label>
          {t("labels.command")}
          <select name="command" value={eventCommand} onChange={(event) => setEventCommand(event.target.value)} style={inputStyle}>
            {eventCommands.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          {t("sections.milestones")}
          <select name="eventId" required style={inputStyle}>
            {events.map((event) => <option key={event.id} value={event.id}>{event.label}</option>)}
          </select>
        </label>
        {eventCommand === "COMPLETE_EVENT" && (
          <label>
            {t("labels.completionDate")}
            <input name="date" type="date" defaultValue={today()} style={inputStyle} />
          </label>
        )}
        {eventCommand === "CHANGE_EVENT_VISIBILITY" && (
          <label>
            {t("labels.visibility")}
            <select name="visibility" defaultValue="DETAILED" style={inputStyle}>
              {visibilityOptions.map((visibility) => (
                <option key={visibility.value} value={visibility.value}>
                  {visibility.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="submit" style={tableButtonStyle}>{t("actions.createSuggestion")}</button>
      </form>

      <SectionHeader title={t("projects.assistedReporting")} />
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <form
          action={async (formData) => {
            formData.set("projectId", projectId);
            await handleAction(createVisibilityCleanupSuggestion, formData);
          }}
        >
          <button type="submit" style={tableButtonStyle}>{t("actions.suggestDetailedVisibility")}</button>
        </form>
        <form
          action={async (formData) => {
            formData.set("projectId", projectId);
            await handleAction(createAccomplishmentsSuggestion, formData);
          }}
        >
          <button type="submit" style={tableButtonStyle}>{t("actions.generateAccomplishments")}</button>
        </form>
      </div>
        </>
      )}

      {activeTab === "REVIEW" && (
        <>
      <SectionHeader title={t("projects.openProgressSuggestions")} />
      {suggestionRows.length === 0 ? (
        <div style={{ color: "#64748b", padding: "0.75rem" }}>
          {t("projects.noOpenProgressSuggestions")}
        </div>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {suggestionRows.map((suggestion) => {
            const approveFormId = `approve-progress-${suggestion.id}`;
            return (
              <OperationalActionCard
                key={suggestion.id}
                entityType={suggestion.command}
                title={suggestion.title}
                project={suggestion.project}
                description={suggestion.summary}
                details={[
                  { label: t("labels.target"), value: suggestion.target },
                  ...(suggestion.date
                    ? [{ label: t("table.date"), value: suggestion.date }]
                    : []),
                  ...(suggestion.visibility
                    ? [
                        {
                          label: t("labels.visibility"),
                          value: translateVisibility(suggestion.visibility, t),
                        },
                      ]
                    : []),
                ]}
                actions={
                  <>
                    <form
                      id={approveFormId}
                      action={async (formData) => {
                        await handleAction(approveProjectProgressSuggestion, formData);
                      }}
                    >
                      <input type="hidden" name="id" value={suggestion.id} />
                    </form>
                    <button type="submit" form={approveFormId} style={tableButtonStyle}>
                      {t("actions.approveSelected")}
                    </button>
                    <form
                      action={async (formData) => {
                        await handleAction(rejectProjectProgressSuggestion, formData);
                      }}
                    >
                      <input type="hidden" name="id" value={suggestion.id} />
                      <button type="submit" style={tableButtonStyle}>
                        {t("actions.rejectAll")}
                      </button>
                    </form>
                  </>
                }
              >
                {(isWorkstreamCommand(suggestion.command) || isEventCommand(suggestion.command)) && (
                  <div style={{ display: "grid", gap: "0.35rem" }}>
                    <strong style={{ color: "#334155", fontSize: "0.82rem" }}>
                      {t("labels.approvalData")}
                    </strong>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: "0.5rem",
                      }}
                    >
                      {isWorkstreamCommand(suggestion.command) && (
                        <label>
                          {t("labels.workstream")}
                          <select
                            name="targetRecordId"
                            defaultValue={suggestion.targetRecordId}
                            form={approveFormId}
                            style={compactInputStyle}
                          >
                            {projectWorkstreams
                              .filter(
                                (workstream) =>
                                  workstream.projectId === suggestion.projectId
                              )
                              .map((workstream) => (
                                <option key={workstream.id} value={workstream.id}>
                                  {workstream.label}
                                </option>
                              ))}
                          </select>
                        </label>
                      )}
                      {isEventCommand(suggestion.command) && (
                        <label>
                          {t("sections.milestones")}
                          <select
                            name="targetRecordId"
                            defaultValue={suggestion.targetRecordId}
                            form={approveFormId}
                            style={compactInputStyle}
                          >
                            {projectEvents
                              .filter((event) => event.projectId === suggestion.projectId)
                              .map((event) => (
                                <option key={event.id} value={event.id}>
                                  {event.label}
                                </option>
                              ))}
                          </select>
                        </label>
                      )}
                      {[
                        "START_WORKSTREAM",
                        "FINISH_WORKSTREAM",
                        "COMPLETE_EVENT",
                      ].includes(suggestion.command) && (
                        <label>
                          {t("table.date")}
                          <input
                            name="date"
                            type="date"
                            defaultValue={suggestion.date || today()}
                            form={approveFormId}
                            style={compactInputStyle}
                          />
                        </label>
                      )}
                      {[
                        "CHANGE_WORKSTREAM_VISIBILITY",
                        "CHANGE_EVENT_VISIBILITY",
                      ].includes(suggestion.command) && (
                        <label>
                          {t("labels.visibility")}
                          <select
                            name="visibility"
                            defaultValue={suggestion.visibility || "DETAILED"}
                            form={approveFormId}
                            style={compactInputStyle}
                          >
                            {visibilityOptions.map((visibility) => (
                              <option key={visibility.value} value={visibility.value}>
                                {visibility.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                    </div>
                  </div>
                )}
                {suggestion.accomplishments && (
                  <div style={{ color: "#334155", fontSize: "0.84rem" }}>
                    {suggestion.accomplishments.sourceReportingPackVersion && (
                      <div>
                        {t("labels.source")}: {suggestion.accomplishments.sourceReportingPackVersion}
                        {suggestion.accomplishments.sinceDate
                          ? ` since ${suggestion.accomplishments.sinceDate}`
                          : ""}
                      </div>
                    )}
                    <AccomplishmentList title="Workstreams" items={suggestion.accomplishments.workstreams} />
                    <AccomplishmentList title="Milestones" items={suggestion.accomplishments.events} />
                    <AccomplishmentList title="Risks" items={suggestion.accomplishments.risks} />
                    <AccomplishmentList title="Risk Actions" items={suggestion.accomplishments.riskActions} />
                    <AccomplishmentList title="Decisions" items={suggestion.accomplishments.decisions} />
                  </div>
                )}
                {suggestion.items.length > 0 && (
                  <div style={{ display: "grid", gap: "0.35rem" }}>
                    {suggestion.items.map((item) => (
                      <label
                        key={`${suggestion.id}-${item.targetRecordId}`}
                        style={{
                          display: "flex",
                          gap: "0.45rem",
                          alignItems: "flex-start",
                          color: "#334155",
                          fontSize: "0.84rem",
                        }}
                      >
                        <input
                          type="checkbox"
                          name="selectedItemIds"
                          value={item.targetRecordId}
                          form={approveFormId}
                          defaultChecked
                        />
                        <span>
                          {item.label}: {translateVisibility(item.fromVisibility, t)} -&gt;{" "}
                          {translateVisibility(item.toVisibility, t)}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </OperationalActionCard>
            );
          })}
        </div>
      )}
        </>
      )}
    </>
  );
}
