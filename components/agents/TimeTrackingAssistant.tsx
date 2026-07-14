"use client";

import { TranslatedButtonLabel } from "@/components/ui/TranslatedControls";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { translateConfiguredOption } from "@/lib/i18n/displayTranslations";

type ActionResult = {
  ok: boolean;
  message: string;
};

type AssistantAction = (formData: FormData) => Promise<ActionResult | undefined>;
type InterpretationAction = (
  formData: FormData
) => Promise<
  | (ActionResult & {
      interpretation?: TimeTrackingInterpretation;
    })
  | undefined
>;

type ProjectOption = {
  id: string;
  projectCode: string;
  name: string;
};

type ProjectTaskOption = {
  id: string;
  name: string;
  parentTaskId: string | null;
  subtasks?: ProjectTaskOption[];
};

type ProjectWorkstreamOption = {
  id: string;
  projectId: string;
  isActive: boolean;
  governedStatus?: {
    code: string;
    name: string;
    nameEs?: string | null;
  } | null;
  workstream: {
    name: string;
    phase: {
      name: string;
    } | null;
  };
  projectTasks?: ProjectTaskOption[];
};

type TaskFamilyOption = {
  id: string;
  code?: string;
  name: string;
  nameEs?: string | null;
};

type WorkSessionRow = {
  id: string;
  project: string;
  workstream: string;
  taskFamily: string;
  taskFamilyCode?: string | null;
  taskFamilyNameEs?: string | null;
  task: string;
  status: string;
  statusNameEs?: string | null;
  statusCode: string;
  startedAt: string;
  endedAt: string;
  activeSeconds: number | null;
  roundedMinutes: number | null;
  notes: string;
  isPaused: boolean;
  convertedTimeEntryId: string | null;
  intervals: {
    id: string;
    startedAt: string;
    endedAt: string;
  }[];
};

type InstructionTemplateOption = {
  id: string;
  label: string;
  instruction: string;
  isDefault: boolean;
};

type SuggestionRow = {
  id: string;
  title: string;
  summary: string;
  projectId: string;
  projectWorkstreamId: string;
  project: string;
  workstream: string;
  taskFamily: string;
  taskFamilyCode?: string | null;
  taskFamilyNameEs?: string | null;
  task: string;
  date: string;
  hours: number;
  notes: string;
  createdAt: string;
};

type TimeTrackingInterpretation = {
  intent: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  rawInstruction: string;
  understoodText: string;
  projectId?: string;
  projectLabel?: string;
  projectWorkstreamId?: string;
  projectWorkstreamLabel?: string;
  taskFamilyId?: string;
  taskFamilyLabel?: string;
  projectTaskId?: string | null;
  projectTaskLabel?: string | null;
  workSessionId?: string | null;
  actionLabel?: string | null;
  notes?: string | null;
  clarification?: string | null;
  candidates?: {
    projects?: { id: string; label: string; score: number }[];
    workstreams?: { id: string; label: string; score: number }[];
    tasks?: { id: string; label: string; score: number }[];
  };
};

type AssistantTab = "START" | "OPEN" | "SUGGESTIONS";

function flattenTasks(projectWorkstream?: ProjectWorkstreamOption) {
  return (
    projectWorkstream?.projectTasks?.flatMap((task) => [
      task,
      ...(task.subtasks ?? []),
    ]) ?? []
  );
}

function formatWorkstream(
  projectWorkstream: ProjectWorkstreamOption,
  locale: ReturnType<typeof useTranslation>["locale"],
  t: ReturnType<typeof useTranslation>["t"]
) {
  const phaseName = projectWorkstream.workstream.phase?.name;
  const statusLabel = !projectWorkstream.isActive
    ? ` (${t("labels.inactive")})`
    : projectWorkstream.governedStatus?.code === "CLOSED"
      ? ` (${translateConfiguredOption(projectWorkstream.governedStatus, locale, t, "status")})`
      : "";
  return `${phaseName ? `${phaseName} / ` : ""}${projectWorkstream.workstream.name}${statusLabel}`;
}

function findWorkstreamLabel(
  projectWorkstreams: ProjectWorkstreamOption[],
  projectWorkstreamId: string | null | undefined,
  locale: ReturnType<typeof useTranslation>["locale"],
  t: ReturnType<typeof useTranslation>["t"]
) {
  const projectWorkstream = projectWorkstreams.find(
    (item) => item.id === projectWorkstreamId
  );
  return projectWorkstream ? formatWorkstream(projectWorkstream, locale, t) : "";
}

function formatDateTime(value: string, useLocalTime: boolean) {
  if (!value) return "-";

  if (!useLocalTime) {
    return value.slice(0, 16).replace("T", " ");
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(seconds: number | null, roundedMinutes: number | null) {
  if (roundedMinutes !== null) {
    return `${Number((roundedMinutes / 60).toFixed(2))}h rounded`;
  }
  if (seconds === null) return "-";

  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function getClientTimestamp() {
  return new Date().toISOString();
}

function getIntervalSeconds(
  interval: { startedAt: string; endedAt: string },
  nowMs: number | null
) {
  const start = new Date(interval.startedAt);
  const end = interval.endedAt
    ? new Date(interval.endedAt)
    : new Date(nowMs ?? start.getTime());
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
}

function getSessionIntervalSeconds(session: WorkSessionRow, nowMs: number | null) {
  return session.intervals.reduce(
    (total, interval) => total + getIntervalSeconds(interval, nowMs),
    0
  );
}

function timeTrackingVoiceConfirmationSegments(
  interpretation: TimeTrackingInterpretation,
  locale: ReturnType<typeof useTranslation>["locale"]
): VoiceConfirmationSegment[] {
  if (locale !== "es") {
    return [{ text: interpretation.understoodText || interpretation.clarification || "" }];
  }

  if (interpretation.intent === "START_WORK_SESSION") {
    return [
      { text: "Entendido. Iniciar registro de tiempo para ", locale: "es" },
      { text: interpretation.projectLabel ?? "", locale: "en" },
      { text: ". Actividad ", locale: "es" },
      { text: interpretation.projectWorkstreamLabel ?? "", locale: "en" },
      ...(interpretation.projectTaskLabel
        ? [
            { text: ". Tarea ", locale: "es" as const },
            { text: interpretation.projectTaskLabel, locale: "en" as const },
          ]
        : []),
      { text: ". ¿Confirmas el inicio?", locale: "es" },
    ];
  }

  const action =
    interpretation.intent === "PAUSE_WORK_SESSION"
      ? "pausar"
      : interpretation.intent === "RESUME_WORK_SESSION"
        ? "reanudar"
        : interpretation.intent === "FINISH_WORK_SESSION"
          ? "finalizar"
          : "aplicar";

  if (interpretation.intent === "UPDATE_WORK_SESSION_NOTES") {
    return [
      {
        text: `Entendido. Actualizar los comentarios de la sesión actual a: ${interpretation.notes ?? ""}. ¿Confirmas la acción?`,
        locale: "es",
      },
    ];
  }

  return [
    { text: `Entendido. ${action} la sesión actual. ¿Confirmas la acción?`, locale: "es" },
  ];
}

function timeTrackingVoiceFallbackSegments(
  interpretation: TimeTrackingInterpretation,
  locale: ReturnType<typeof useTranslation>["locale"]
): VoiceConfirmationSegment[] {
  if (
    interpretation.intent !== "UNKNOWN" ||
    !interpretation.workSessionId ||
    !interpretation.projectLabel ||
    !interpretation.projectWorkstreamLabel
  ) {
    return [
      {
        text: interpretation.understoodText || interpretation.clarification || "",
        locale,
      },
    ];
  }

  if (locale !== "es") {
    return [
      { text: "I could not identify the instruction. There is an open session for " },
      { text: interpretation.projectLabel, locale: "en" },
      { text: ". Workstream " },
      { text: interpretation.projectWorkstreamLabel, locale: "en" },
      { text: ". You can say pause, finish, or use cancel on screen." },
    ];
  }

  return [
    { text: "No he podido identificar la instrucción. Hay una sesión abierta para ", locale: "es" },
    { text: interpretation.projectLabel, locale: "en" },
    { text: ". Actividad ", locale: "es" },
    { text: interpretation.projectWorkstreamLabel, locale: "en" },
    { text: ". Puedes decir pausar, finalizar, o usar cancelar en pantalla.", locale: "es" },
  ];
}

const tableNoteInputStyle = {
  ...compactInputStyle,
  fontSize: "0.82rem",
  minHeight: "20px",
  lineHeight: 1,
  padding: "0.1rem 0.25rem",
};

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

export function TimeTrackingAssistant({
  projects,
  projectWorkstreams,
  taskFamilies,
  defaultProjectId,
  defaultProjectWorkstreamId,
  defaultTaskFamilyId,
  workSessions,
  suggestions,
  instructionTemplates,
  voiceInputEnabled,
  interpretTimeTrackingInstruction,
  startWorkSession,
  pauseWorkSession,
  resumeWorkSession,
  finishWorkSession,
  cancelWorkSession,
  updateWorkSessionNotes,
  approveTimeEntrySuggestion,
  rejectTimeEntrySuggestion,
}: {
  projects: ProjectOption[];
  projectWorkstreams: ProjectWorkstreamOption[];
  taskFamilies: TaskFamilyOption[];
  defaultProjectId: string;
  defaultProjectWorkstreamId: string;
  defaultTaskFamilyId: string;
  workSessions: WorkSessionRow[];
  suggestions: SuggestionRow[];
  instructionTemplates: InstructionTemplateOption[];
  voiceInputEnabled: boolean;
  interpretTimeTrackingInstruction: InterpretationAction;
  startWorkSession: AssistantAction;
  pauseWorkSession: AssistantAction;
  resumeWorkSession: AssistantAction;
  finishWorkSession: AssistantAction;
  cancelWorkSession: AssistantAction;
  updateWorkSessionNotes: AssistantAction;
  approveTimeEntrySuggestion: AssistantAction;
  rejectTimeEntrySuggestion: AssistantAction;
}) {
  const { t, locale } = useTranslation();
  const { handleAction } = useActionToast();
  const [selectedProject, setSelectedProject] = useState(defaultProjectId);
  const [selectedProjectWorkstream, setSelectedProjectWorkstream] = useState(
    defaultProjectWorkstreamId
  );
  const [useLocalTime, setUseLocalTime] = useState(false);
  const [nowMs, setNowMs] = useState<number | null>(null);
  const defaultTemplate =
    instructionTemplates.find((template) => template.isDefault) ??
    instructionTemplates[0];
  const [selectedInstruction, setSelectedInstruction] = useState(
    defaultTemplate?.instruction ?? "I am starting work"
  );
  const [naturalInstruction, setNaturalInstruction] = useState("");
  const [naturalInstructionSource, setNaturalInstructionSource] =
    useState<"TEXT" | "VOICE">("TEXT");
  const [interpretation, setInterpretation] =
    useState<TimeTrackingInterpretation | null>(null);
  const [confirmedProjectWorkstreamId, setConfirmedProjectWorkstreamId] =
    useState("");
  const [interpretationMessage, setInterpretationMessage] = useState("");
  const [activeTab, setActiveTab] = useState<AssistantTab>(
    workSessions.length > 0 ? "OPEN" : "START"
  );
  const previousWorkSessionCount = useRef(workSessions.length);
  const tabLabels: Record<AssistantTab, string> = {
    START:
      t("timeTracking.startWorkTab") === "timeTracking.startWorkTab"
        ? "Start Work"
        : t("timeTracking.startWorkTab"),
    OPEN:
      t("timeTracking.openSessionsTab") === "timeTracking.openSessionsTab"
        ? "Open Sessions"
        : t("timeTracking.openSessionsTab"),
    SUGGESTIONS:
      t("timeTracking.suggestionsTab") === "timeTracking.suggestionsTab"
        ? "Review Suggestions"
        : t("timeTracking.suggestionsTab"),
  };

  const filteredProjectWorkstreams = useMemo(
    () =>
      projectWorkstreams.filter(
        (projectWorkstream) => projectWorkstream.projectId === selectedProject
      ),
    [projectWorkstreams, selectedProject]
  );

  const selectedWorkstream = projectWorkstreams.find(
    (projectWorkstream) => projectWorkstream.id === selectedProjectWorkstream
  );
  const availableTasks = flattenTasks(selectedWorkstream);

  useEffect(() => {
    const updateLocalClock = () => {
      setUseLocalTime(true);
      setNowMs(Date.now());
    };

    const initialTimeoutId = window.setTimeout(updateLocalClock, 0);
    const intervalId = window.setInterval(() => {
      updateLocalClock();
    }, 30000);

    return () => {
      window.clearTimeout(initialTimeoutId);
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (previousWorkSessionCount.current === 0 && workSessions.length > 0) {
      setActiveTab("OPEN");
    }
    previousWorkSessionCount.current = workSessions.length;
  }, [workSessions.length]);

  function clearNaturalLanguageState() {
    setInterpretation(null);
    setInterpretationMessage("");
    setNaturalInstruction("");
    setConfirmedProjectWorkstreamId("");
  }

  async function applyPendingInterpretation(pending = interpretation) {
    if (!pending) return false;

    if (
      pending.intent === "START_WORK_SESSION" &&
      pending.projectId &&
      confirmedProjectWorkstreamId &&
      pending.taskFamilyId
    ) {
      const formData = new FormData();
      formData.set("projectId", pending.projectId);
      formData.set("projectWorkstreamId", confirmedProjectWorkstreamId);
      formData.set("taskFamilyId", pending.taskFamilyId);
      formData.set("projectTaskId", pending.projectTaskId ?? "");
      formData.set("instruction", pending.rawInstruction);
      formData.set(
        "interpretationCorrection",
        confirmedProjectWorkstreamId !== pending.projectWorkstreamId
          ? `Workstream corrected from ${pending.projectWorkstreamLabel} to ${findWorkstreamLabel(projectWorkstreams, confirmedProjectWorkstreamId, locale, t)}`
          : ""
      );
      formData.set("sourceType", naturalInstructionSource);
      formData.set("notes", pending.notes ?? "");
      formData.set("clientTimestamp", getClientTimestamp());
      await handleAction(startWorkSession, formData);
      clearNaturalLanguageState();
      return true;
    }

    if (
      pending.workSessionId &&
      [
        "PAUSE_WORK_SESSION",
        "RESUME_WORK_SESSION",
        "FINISH_WORK_SESSION",
        "UPDATE_WORK_SESSION_NOTES",
      ].includes(
        pending.intent
      )
    ) {
      const action =
        pending.intent === "PAUSE_WORK_SESSION"
          ? pauseWorkSession
          : pending.intent === "RESUME_WORK_SESSION"
            ? resumeWorkSession
            : pending.intent === "FINISH_WORK_SESSION"
              ? finishWorkSession
              : updateWorkSessionNotes;
      const formData = new FormData();
      formData.set("id", pending.workSessionId);
      formData.set("clientTimestamp", getClientTimestamp());
      if (pending.intent === "UPDATE_WORK_SESSION_NOTES") {
        formData.set("notes", pending.notes ?? "");
      }
      await handleAction(action, formData);
      clearNaturalLanguageState();
      return true;
    }

    return false;
  }

  function repeatPendingConfirmation() {
    if (!interpretation) return;

    const segments =
      interpretation.intent === "UNKNOWN"
        ? timeTrackingVoiceFallbackSegments(interpretation, locale)
        : timeTrackingVoiceConfirmationSegments(interpretation, locale);
    speakVoiceConfirmationSegments(segments, locale);
  }

  async function handlePendingVoiceConfirmation(transcript: string) {
    const commandIntent = detectVoiceCommandIntent(transcript);
    if (commandIntent === "APPLY") {
      const applied = await applyPendingInterpretation();
      speakVoiceConfirmation(
        applied
          ? locale === "es"
            ? "Aplicado."
            : "Applied."
          : locale === "es"
            ? "No hay una acción pendiente para aplicar."
            : "There is no pending action to apply.",
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
              ? "Aplicado."
              : "Applied."
            : locale === "es"
              ? "No hay una acción pendiente para aplicar."
              : "There is no pending action to apply.",
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
    formData.set("sourceType", sourceType);
    formData.set("projectId", selectedProject);

    const result = await interpretTimeTrackingInstruction(formData);
    setInterpretationMessage(result?.message ?? "");
    setInterpretation(result?.interpretation ?? null);
    if (result?.interpretation?.projectId) {
      setSelectedProject(result.interpretation.projectId);
      setSelectedProjectWorkstream(
        result.interpretation.projectWorkstreamId ??
          projectWorkstreams.find(
            (projectWorkstream) =>
              projectWorkstream.projectId === result.interpretation?.projectId
          )?.id ??
          ""
      );
    }
    setConfirmedProjectWorkstreamId(
      result?.interpretation?.projectWorkstreamId ?? ""
    );
    if (sourceType === "VOICE" && result?.interpretation) {
      const segments =
        result.interpretation.intent === "UNKNOWN"
          ? timeTrackingVoiceFallbackSegments(result.interpretation, locale)
          : timeTrackingVoiceConfirmationSegments(result.interpretation, locale);
      speakVoiceConfirmationSegments(segments, locale);
    } else if (sourceType === "VOICE") {
      speakVoiceConfirmation(result?.message || "", locale);
    }
  }

  function renderNaturalLanguagePilot() {
    return (
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
              placeholder={t("timeTracking.instructionPlaceholder")}
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
      </>
    );
  }

  function renderInterpretationResult() {
    return (
      <>
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
            {interpretation.candidates?.workstreams?.length ? (
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
                  value={confirmedProjectWorkstreamId}
                  onChange={(event) => setConfirmedProjectWorkstreamId(event.target.value)}
                  style={{ ...inputStyle, marginTop: "0.25rem" }}
                >
                  {interpretation.candidates.workstreams.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {interpretation.clarification && (
              <div style={{ color: "#64748b", marginBottom: "0.5rem" }}>
                {interpretation.clarification}
              </div>
            )}
            {interpretation.intent === "START_WORK_SESSION" &&
              interpretation.projectId &&
              confirmedProjectWorkstreamId &&
              interpretation.taskFamilyId && (
                <form
                  action={async (formData) => {
                    formData.set("clientTimestamp", getClientTimestamp());
                    await handleAction(startWorkSession, formData);
                    clearNaturalLanguageState();
                  }}
                >
                  <input type="hidden" name="projectId" value={interpretation.projectId} />
                  <input
                    type="hidden"
                    name="projectWorkstreamId"
                    value={confirmedProjectWorkstreamId}
                  />
                  <input
                    type="hidden"
                    name="taskFamilyId"
                    value={interpretation.taskFamilyId}
                  />
                  <input
                    type="hidden"
                    name="projectTaskId"
                    value={interpretation.projectTaskId ?? ""}
                  />
                  <input
                    type="hidden"
                    name="instruction"
                    value={interpretation.rawInstruction}
                  />
                  <input
                    type="hidden"
                    name="interpretationCorrection"
                    value={
                      confirmedProjectWorkstreamId !== interpretation.projectWorkstreamId
                        ? `Workstream corrected from ${interpretation.projectWorkstreamLabel} to ${findWorkstreamLabel(projectWorkstreams, confirmedProjectWorkstreamId, locale, t)}`
                        : ""
                    }
                  />
                  <input type="hidden" name="sourceType" value={naturalInstructionSource} />
                  <input type="hidden" name="notes" value={interpretation.notes ?? ""} />
                  <div style={{ ...tableActionGroupStyle, marginTop: "0.65rem" }}>
                    <button
                      type="submit"
                      disabled={!confirmedProjectWorkstreamId}
                      style={{
                        ...pendingActionButtonStyle,
                        opacity: !confirmedProjectWorkstreamId ? 0.55 : 1,
                      }}
                    >
                      {t("actions.confirmStart")}
                    </button>
                    {renderPendingVoiceControls()}
                  </div>
                </form>
              )}
            {interpretation.workSessionId &&
              [
                "PAUSE_WORK_SESSION",
                "RESUME_WORK_SESSION",
                "FINISH_WORK_SESSION",
                "UPDATE_WORK_SESSION_NOTES",
              ].includes(
                interpretation.intent
              ) && (
                <form
                  action={async (formData) => {
                    formData.set("clientTimestamp", getClientTimestamp());
                    const action =
                      interpretation.intent === "PAUSE_WORK_SESSION"
                        ? pauseWorkSession
                        : interpretation.intent === "RESUME_WORK_SESSION"
                          ? resumeWorkSession
                          : interpretation.intent === "FINISH_WORK_SESSION"
                            ? finishWorkSession
                            : updateWorkSessionNotes;
                    await handleAction(action, formData);
                    clearNaturalLanguageState();
                  }}
                >
                  <input type="hidden" name="id" value={interpretation.workSessionId} />
                  {interpretation.intent === "UPDATE_WORK_SESSION_NOTES" && (
                    <input type="hidden" name="notes" value={interpretation.notes ?? ""} />
                  )}
                  <div style={{ ...tableActionGroupStyle, marginTop: "0.65rem" }}>
                    <button type="submit" style={pendingActionButtonStyle}>
                      {t("actions.confirmAction")}
                    </button>
                    {renderPendingVoiceControls()}
                  </div>
                </form>
              )}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {[
          ["START", tabLabels.START],
          ["OPEN", tabLabels.OPEN],
          ["SUGGESTIONS", tabLabels.SUGGESTIONS],
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

      {activeTab === "START" && (
        <>
      {renderNaturalLanguagePilot()}

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
          {interpretation.candidates?.workstreams?.length ? (
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
                value={confirmedProjectWorkstreamId}
                onChange={(event) => setConfirmedProjectWorkstreamId(event.target.value)}
                style={{ ...inputStyle, marginTop: "0.25rem" }}
              >
                {interpretation.candidates.workstreams.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {interpretation.clarification && (
            <div style={{ color: "#64748b", marginBottom: "0.5rem" }}>
              {interpretation.clarification}
            </div>
          )}
          {interpretation.intent === "START_WORK_SESSION" &&
            interpretation.projectId &&
            confirmedProjectWorkstreamId &&
            interpretation.taskFamilyId && (
              <form
                action={async (formData) => {
                  formData.set("clientTimestamp", getClientTimestamp());
                  await handleAction(startWorkSession, formData);
                  clearNaturalLanguageState();
                }}
              >
                <input type="hidden" name="projectId" value={interpretation.projectId} />
                <input
                  type="hidden"
                  name="projectWorkstreamId"
                  value={confirmedProjectWorkstreamId}
                />
                <input
                  type="hidden"
                  name="taskFamilyId"
                  value={interpretation.taskFamilyId}
                />
                <input
                  type="hidden"
                  name="projectTaskId"
                  value={interpretation.projectTaskId ?? ""}
                />
                <input
                  type="hidden"
                  name="instruction"
                  value={interpretation.rawInstruction}
                />
                <input
                  type="hidden"
                  name="interpretationCorrection"
                  value={
                    confirmedProjectWorkstreamId !== interpretation.projectWorkstreamId
                      ? `Workstream corrected from ${interpretation.projectWorkstreamLabel} to ${findWorkstreamLabel(projectWorkstreams, confirmedProjectWorkstreamId, locale, t)}`
                      : ""
                  }
                />
                <input type="hidden" name="sourceType" value={naturalInstructionSource} />
                <input type="hidden" name="notes" value={interpretation.notes ?? ""} />
                <div style={{ ...tableActionGroupStyle, marginTop: "0.65rem" }}>
                  <button
                    type="submit"
                    disabled={!confirmedProjectWorkstreamId}
                    style={{
                      ...pendingActionButtonStyle,
                      opacity: !confirmedProjectWorkstreamId ? 0.55 : 1,
                    }}
                  >
                    {t("actions.confirmStart")}
                  </button>
                  {renderPendingVoiceControls()}
                </div>
              </form>
            )}
          {interpretation.workSessionId &&
            [
              "PAUSE_WORK_SESSION",
              "RESUME_WORK_SESSION",
              "FINISH_WORK_SESSION",
              "UPDATE_WORK_SESSION_NOTES",
            ].includes(
              interpretation.intent
            ) && (
            <form
                action={async (formData) => {
                  formData.set("clientTimestamp", getClientTimestamp());
                  const action =
                  interpretation.intent === "PAUSE_WORK_SESSION"
                    ? pauseWorkSession
                    : interpretation.intent === "RESUME_WORK_SESSION"
                      ? resumeWorkSession
                      : interpretation.intent === "FINISH_WORK_SESSION"
                        ? finishWorkSession
                        : updateWorkSessionNotes;
                await handleAction(action, formData);
                clearNaturalLanguageState();
              }}
            >
              <input type="hidden" name="id" value={interpretation.workSessionId} />
              {interpretation.intent === "UPDATE_WORK_SESSION_NOTES" && (
                <input type="hidden" name="notes" value={interpretation.notes ?? ""} />
              )}
              <div style={{ ...tableActionGroupStyle, marginTop: "0.65rem" }}>
                <button type="submit" style={pendingActionButtonStyle}>
                  {t("actions.confirmAction")}
                </button>
                {renderPendingVoiceControls()}
              </div>
            </form>
          )}
        </div>
      )}

      <form
        className="assistant-form-grid"
        action={async (formData) => {
          formData.set("clientTimestamp", getClientTimestamp());
          await handleAction(startWorkSession, formData);
        }}
        style={{
          display: "grid",
          gap: "0.5rem",
          alignItems: "end",
          marginBottom: "1rem",
          maxWidth: 760,
        }}
      >
        <label>
          {t("labels.project")}
          <select
            name="projectId"
            required
            value={selectedProject}
            onChange={(event) => {
              const nextProjectId = event.target.value;
              setSelectedProject(nextProjectId);
              setSelectedProjectWorkstream(
                projectWorkstreams.find(
                  (projectWorkstream) =>
                    projectWorkstream.projectId === nextProjectId
                )?.id ?? ""
              );
            }}
            style={inputStyle}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.projectCode} - {project.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t("labels.workstream")}
          <select
            name="projectWorkstreamId"
            required
            value={selectedProjectWorkstream}
            onChange={(event) => setSelectedProjectWorkstream(event.target.value)}
            style={inputStyle}
          >
            <option value="">{t("timeTracking.selectWorkstream")}</option>
            {filteredProjectWorkstreams.map((projectWorkstream) => (
              <option key={projectWorkstream.id} value={projectWorkstream.id}>
                {formatWorkstream(projectWorkstream, locale, t)}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t("labels.taskFamily")}
          <select
            name="taskFamilyId"
            required
            defaultValue={defaultTaskFamilyId}
            style={inputStyle}
          >
            {taskFamilies.map((taskFamily) => (
              <option key={taskFamily.id} value={taskFamily.id}>
                {translateConfiguredOption(taskFamily, locale, t, "taskFamily")}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t("labels.task")}
          <select name="projectTaskId" defaultValue="" style={inputStyle}>
            <option value="">{t("timeTracking.noTask")}</option>
            {availableTasks.map((task) => (
              <option
                key={`${task.parentTaskId ? "subtask" : "task"}-${task.id}`}
                value={task.id}
              >
                {task.parentTaskId ? "-> " : ""}
                {task.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t("timeTracking.instruction")}
          <select
            value={selectedInstruction}
            onChange={(event) => setSelectedInstruction(event.target.value)}
            style={inputStyle}
          >
            {instructionTemplates.map((template) => (
              <option key={template.id} value={template.instruction}>
                {template.label}
              </option>
            ))}
          </select>
          <input type="hidden" name="instruction" value={selectedInstruction} />
        </label>

        <label>
          {t("labels.notes")}
          <input name="notes" placeholder={t("labels.notes")} style={inputStyle} />
        </label>

        <div>
          <button type="submit" style={tableButtonStyle}>
            {t("actions.startSession")}
          </button>
        </div>
      </form>
        </>
      )}

      {activeTab === "OPEN" && (
        <>
      {renderNaturalLanguagePilot()}
      {renderInterpretationResult()}
      <SectionHeader title={t("timeTracking.workSessions")} />
      {workSessions.length === 0 ? (
        <div style={{ color: "#64748b", padding: "0.75rem" }}>
          {t("timeTracking.noSessions")}
        </div>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem", maxWidth: 860 }}>
          {workSessions.map((session) => (
            <OperationalActionCard
              key={session.id}
              entityType={translateConfiguredOption(
                {
                  code: session.statusCode,
                  name: session.status,
                  nameEs: session.statusNameEs,
                },
                locale,
                t,
                "status"
              )}
              title={session.workstream}
              project={session.project}
              details={[
                {
                  label: t("labels.taskFamily"),
                  value: translateConfiguredOption(
                    {
                      code: session.taskFamilyCode,
                      name: session.taskFamily,
                      nameEs: session.taskFamilyNameEs,
                    },
                    locale,
                    t,
                    "taskFamily"
                  ),
                },
                { label: t("labels.task"), value: session.task || "-" },
                {
                  label: t("timeTracking.started"),
                  value: formatDateTime(session.startedAt, useLocalTime),
                },
                {
                  label: t("timeTracking.duration"),
                  value: formatDuration(
                    session.activeSeconds ?? getSessionIntervalSeconds(session, nowMs),
                    session.roundedMinutes
                  ),
                },
              ]}
              actions={
                <>
                  {session.statusCode === "IN_PROGRESS" && (
                    <form
                      action={async (formData) => {
                        formData.set("clientTimestamp", getClientTimestamp());
                        await handleAction(pauseWorkSession, formData);
                      }}
                    >
                      <input type="hidden" name="id" value={session.id} />
                      <button type="submit" style={tableButtonStyle}>
                        {t("actions.pause")}
                      </button>
                    </form>
                  )}
                  {session.statusCode === "ON_HOLD" && (
                    <form
                      action={async (formData) => {
                        formData.set("clientTimestamp", getClientTimestamp());
                        await handleAction(resumeWorkSession, formData);
                      }}
                    >
                      <input type="hidden" name="id" value={session.id} />
                      <button type="submit" style={tableButtonStyle}>
                        {t("actions.resume")}
                      </button>
                    </form>
                  )}
                  {["IN_PROGRESS", "ON_HOLD"].includes(session.statusCode) && (
                    <>
                      <form
                        action={async (formData) => {
                          formData.set("clientTimestamp", getClientTimestamp());
                          await handleAction(finishWorkSession, formData);
                        }}
                      >
                        <input type="hidden" name="id" value={session.id} />
                        <button type="submit" style={tableButtonStyle}>
                          {t("actions.finish")}
                        </button>
                      </form>
                      <form
                        action={async (formData) => {
                          formData.set("clientTimestamp", getClientTimestamp());
                          await handleAction(cancelWorkSession, formData);
                        }}
                      >
                        <input type="hidden" name="id" value={session.id} />
                        <button type="submit" style={tableButtonStyle}>
                          <TranslatedButtonLabel labelKey="actions.cancel" />
                        </button>
                      </form>
                    </>
                  )}
                  {session.convertedTimeEntryId && <span>{t("timeTracking.converted")}</span>}
                </>
              }
            >
              {session.isPaused && (
                <div style={{ color: "#64748b", fontSize: "0.82rem" }}>
                  {t("timeTracking.pausedAfter")}{" "}
                  {formatDuration(getSessionIntervalSeconds(session, nowMs), null)}
                </div>
              )}
              {["IN_PROGRESS", "ON_HOLD"].includes(session.statusCode) ? (
                <form
                  id={`update-notes-${session.id}`}
                  action={async (formData) => {
                    await handleAction(updateWorkSessionNotes, formData);
                  }}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(180px, 1fr) auto",
                    gap: "0.45rem",
                    alignItems: "end",
                  }}
                >
                  <input type="hidden" name="id" value={session.id} />
                  <label>
                    {t("labels.notes")}
                    <input
                      name="notes"
                      defaultValue={session.notes}
                      style={tableNoteInputStyle}
                    />
                  </label>
                  <button type="submit" style={tableButtonStyle}>
                    <TranslatedButtonLabel labelKey="actions.save" />
                  </button>
                </form>
              ) : (
                <div style={{ color: "#64748b", fontSize: "0.82rem" }}>
                  {session.notes || "-"}
                </div>
              )}
              {session.intervals.length > 0 && (
                <div
                  style={{
                    borderTop: "1px solid #e2e8f0",
                    paddingTop: "0.5rem",
                    display: "grid",
                    gap: "0.25rem",
                  }}
                >
                  <div style={{ color: "#334155", fontWeight: 800 }}>
                    {t("timeTracking.workSessionIntervals")}
                  </div>
                  {session.intervals.map((interval, index) => (
                    <div
                      key={interval.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "auto 1fr",
                        gap: "0.35rem 0.65rem",
                        color: "#334155",
                        fontSize: "0.82rem",
                      }}
                    >
                      <strong>#{index + 1}</strong>
                      <span>
                        {formatDateTime(interval.startedAt, useLocalTime)} -{" "}
                        {interval.endedAt
                          ? formatDateTime(interval.endedAt, useLocalTime)
                          : t("labels.active")}{" "}
                        ({formatDuration(getIntervalSeconds(interval, nowMs), null)})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </OperationalActionCard>
          ))}
        </div>
      )}
        </>
      )}

      {activeTab === "SUGGESTIONS" && (
        <>
      <SectionHeader title={t("timeTracking.timeEntrySuggestions")} />
      {suggestions.length === 0 ? (
        <div style={{ color: "#64748b", padding: "0.75rem" }}>
          {t("timeTracking.noSuggestions")}
        </div>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {suggestions.map((suggestion) => {
            const approveFormId = `approve-suggestion-${suggestion.id}`;
            return (
              <OperationalActionCard
                key={suggestion.id}
                entityType={t("labels.suggestion")}
                title={suggestion.title}
                project={suggestion.project}
                description={suggestion.summary}
                details={[
                  {
                    label: t("labels.taskFamily"),
                    value: translateConfiguredOption(
                      {
                        code: suggestion.taskFamilyCode,
                        name: suggestion.taskFamily,
                        nameEs: suggestion.taskFamilyNameEs,
                      },
                      locale,
                      t,
                      "taskFamily"
                    ),
                  },
                  { label: t("labels.task"), value: suggestion.task },
                ]}
                actions={
                  <>
                    <form
                      id={approveFormId}
                      action={async (formData) => {
                        await handleAction(approveTimeEntrySuggestion, formData);
                      }}
                    >
                      <input type="hidden" name="id" value={suggestion.id} />
                    </form>
                    <button type="submit" form={approveFormId} style={tableButtonStyle}>
                      {t("actions.approve")}
                    </button>
                    <form
                      action={async (formData) => {
                        await handleAction(rejectTimeEntrySuggestion, formData);
                      }}
                    >
                      <input type="hidden" name="id" value={suggestion.id} />
                      <button type="submit" style={tableButtonStyle}>
                        {t("actions.reject")}
                      </button>
                    </form>
                  </>
                }
              >
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
                    <label>
                      {t("labels.workstream")}
                      <select
                        name="projectWorkstreamId"
                        defaultValue={suggestion.projectWorkstreamId}
                        form={approveFormId}
                        style={compactInputStyle}
                      >
                        {projectWorkstreams
                          .filter(
                            (projectWorkstream) =>
                              projectWorkstream.projectId === suggestion.projectId
                          )
                          .map((projectWorkstream) => (
                            <option key={projectWorkstream.id} value={projectWorkstream.id}>
                              {formatWorkstream(projectWorkstream, locale, t)}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label>
                      {t("table.date")}
                      <input
                        name="date"
                        type="date"
                        defaultValue={suggestion.date}
                        form={approveFormId}
                        style={compactInputStyle}
                      />
                    </label>
                    <label>
                      {t("labels.hours")}
                      <input
                        name="hours"
                        type="number"
                        step="0.25"
                        min="0.25"
                        defaultValue={suggestion.hours}
                        form={approveFormId}
                        style={compactInputStyle}
                      />
                    </label>
                    <label>
                      {t("labels.notes")}
                      <input
                        name="notes"
                        defaultValue={suggestion.notes}
                        form={approveFormId}
                        style={compactInputStyle}
                      />
                    </label>
                  </div>
                </div>
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
