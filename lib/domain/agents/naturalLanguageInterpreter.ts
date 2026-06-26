export type NaturalLanguageIntent =
  | "START_WORK_SESSION"
  | "PAUSE_WORK_SESSION"
  | "RESUME_WORK_SESSION"
  | "FINISH_WORK_SESSION"
  | "UNKNOWN";

export type NaturalLanguageDetectedLanguage = "en" | "es" | "unknown";

export type ProjectProgressNaturalLanguageCommand =
  | "START_WORKSTREAM"
  | "FINISH_WORKSTREAM"
  | "REOPEN_WORKSTREAM"
  | "CHANGE_WORKSTREAM_VISIBILITY"
  | "COMPLETE_EVENT"
  | "REOPEN_EVENT"
  | "CHANGE_EVENT_VISIBILITY";

export type ProjectProgressNaturalLanguageTarget = "WORKSTREAM" | "EVENT" | null;

export type NaturalLanguageMatchCandidate = {
  id: string;
  label: string;
  score: number;
};

export type TimeTrackingNaturalLanguageParse = {
  language: NaturalLanguageDetectedLanguage;
  normalizedText: string;
  intent: NaturalLanguageIntent;
};

export type ProjectProgressNaturalLanguageParse = {
  language: NaturalLanguageDetectedLanguage;
  normalizedText: string;
  command: ProjectProgressNaturalLanguageCommand | null;
  targetType: ProjectProgressNaturalLanguageTarget;
  visibility: "BOTH" | "EXECUTIVE" | "DETAILED" | "HIDDEN" | null;
};

export type TimeTrackingInterpretation = {
  intent: NaturalLanguageIntent;
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
    projects?: NaturalLanguageMatchCandidate[];
    workstreams?: NaturalLanguageMatchCandidate[];
    tasks?: NaturalLanguageMatchCandidate[];
  };
};

type MatchableRecord = {
  id: string;
  label: string;
  aliases?: string[];
};

const startWords = [
  "start",
  "starting",
  "work on",
  "working on",
  "begin",
  "iniciar",
  "inicio",
  "iniciando",
  "empezar",
  "empiezo",
  "empezando",
  "comenzar",
  "comienzo",
  "comenzando",
  "arrancar",
  "trabajar en",
  "trabajando en",
];
const pauseWords = ["pause", "pausing", "pausar", "pausa"];
const resumeWords = ["resume", "restart", "continue", "reanudar", "reanudo", "continuar", "continuo", "seguir"];
const finishWords = [
  "finish",
  "finished",
  "stop",
  "end",
  "complete",
  "finalizar",
  "finalizo",
  "terminar",
  "termino",
  "completar",
  "completo",
  "acabar",
  "acabo",
  "cerrar",
  "cierro",
  "parar",
  "paro",
];
const spanishMarkers = [
  "actividad",
  "actividades",
  "hito",
  "hitos",
  "fase",
  "iniciar",
  "inicio",
  "empezar",
  "empiezo",
  "comenzar",
  "comienzo",
  "trabajar",
  "trabajando",
  "pausar",
  "reanudar",
  "finalizar",
  "terminar",
  "completar",
  "cerrar",
  "visibilidad",
  "detallado",
  "ejecutivo",
];
const englishMarkers = [
  "workstream",
  "milestone",
  "phase",
  "start",
  "starting",
  "begin",
  "pause",
  "resume",
  "finish",
  "complete",
  "visibility",
  "detailed",
  "executive",
];
const ignoredTokens = new Set([
  "i",
  "am",
  "a",
  "an",
  "the",
  "to",
  "in",
  "with",
  "on",
  "of",
  "for",
  "start",
  "starting",
  "finish",
  "finished",
  "complete",
  "completed",
  "close",
  "closed",
  "reopen",
  "work",
  "working",
  "workstream",
  "milestone",
  "event",
  "project",
  "agent",
  "yo",
  "estoy",
  "esta",
  "a",
  "al",
  "el",
  "la",
  "los",
  "las",
  "un",
  "una",
  "de",
  "del",
  "en",
  "con",
  "para",
  "iniciar",
  "inicio",
  "empezar",
  "empiezo",
  "comenzar",
  "comienzo",
  "trabajar",
  "trabajando",
  "finalizar",
  "finalizo",
  "terminar",
  "termino",
  "completar",
  "completo",
  "cerrar",
  "cierro",
  "reabrir",
  "reanudar",
  "continuar",
  "pausar",
  "pausa",
  "actividad",
  "actividades",
  "hito",
  "hitos",
  "proyecto",
  "agente",
]);

export function normalizeNaturalLanguage(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function detectNaturalLanguageLanguage(
  rawInstruction: string
): NaturalLanguageDetectedLanguage {
  const text = normalizeNaturalLanguage(rawInstruction);
  if (!text) return "unknown";

  const spanishScore = spanishMarkers.filter((marker) =>
    text.includes(marker)
  ).length;
  const englishScore = englishMarkers.filter((marker) =>
    text.includes(marker)
  ).length;

  if (spanishScore === 0 && englishScore === 0) return "unknown";
  if (spanishScore >= englishScore) return "es";
  return "en";
}

export function detectNaturalLanguageIntent(rawInstruction: string): NaturalLanguageIntent {
  const text = normalizeNaturalLanguage(rawInstruction);
  if (!text) return "UNKNOWN";
  if (pauseWords.some((word) => text.includes(word))) return "PAUSE_WORK_SESSION";
  if (resumeWords.some((word) => text.includes(word))) return "RESUME_WORK_SESSION";
  if (finishWords.some((word) => text.includes(word))) return "FINISH_WORK_SESSION";
  if (startWords.some((word) => text.includes(word))) return "START_WORK_SESSION";
  return "UNKNOWN";
}

export function parseTimeTrackingNaturalLanguage(
  rawInstruction: string
): TimeTrackingNaturalLanguageParse {
  const normalizedText = normalizeNaturalLanguage(rawInstruction);
  return {
    language: detectNaturalLanguageLanguage(rawInstruction),
    normalizedText,
    intent: detectNaturalLanguageIntent(rawInstruction),
  };
}

export function parseProjectProgressNaturalLanguage(
  rawInstruction: string
): ProjectProgressNaturalLanguageParse {
  const text = normalizeNaturalLanguage(rawInstruction);
  const language = detectNaturalLanguageLanguage(rawInstruction);
  if (!text) {
    return {
      language,
      normalizedText: text,
      command: null,
      targetType: null,
      visibility: null,
    };
  }

  const mentionsEvent = /\b(event|events|milestone|milestones|hito|hitos)\b/.test(text);
  const mentionsWorkstream =
    /\b(workstream|workstreams|stream|streams|actividad|actividades)\b/.test(text);
  const wantsReopen = /\b(reopen|re opened|restart|reabrir|reabro|reanudar)\b/.test(text);
  const wantsStart = /\b(start|starting|begin|began|iniciar|inicio|iniciando|empezar|empiezo|empezando|comenzar|comienzo|comenzando|arrancar)\b/.test(text);
  const wantsFinish = /\b(finish|finished|complete|completed|close|closed|done|finalizar|finalizo|terminar|termino|completar|completo|cerrar|cierro|acabar|acabo)\b/.test(text);
  const wantsVisibility =
    /\b(visibility|visible|move|show|hide|detailed|executive|both|hidden|visibilidad|mover|mostrar|ocultar|esconder|detallado|detalle|ejecutivo|ambos|oculto)\b/.test(text);

  if (wantsVisibility) {
    return {
      language,
      normalizedText: text,
      command: mentionsEvent ? "CHANGE_EVENT_VISIBILITY" : "CHANGE_WORKSTREAM_VISIBILITY",
      targetType: mentionsEvent ? "EVENT" : "WORKSTREAM",
      visibility: inferProjectVisibility(text),
    };
  }

  if (wantsReopen) {
    return {
      language,
      normalizedText: text,
      command: mentionsEvent ? "REOPEN_EVENT" : "REOPEN_WORKSTREAM",
      targetType: mentionsEvent ? "EVENT" : "WORKSTREAM",
      visibility: null,
    };
  }

  if (wantsStart && !mentionsEvent) {
    return {
      language,
      normalizedText: text,
      command: "START_WORKSTREAM",
      targetType: "WORKSTREAM",
      visibility: null,
    };
  }

  if (wantsFinish) {
    const targetType =
      mentionsEvent || (!mentionsWorkstream && /\b(milestone|hito)\b/.test(text))
        ? "EVENT"
        : "WORKSTREAM";
    return {
      language,
      normalizedText: text,
      command: targetType === "EVENT" ? "COMPLETE_EVENT" : "FINISH_WORKSTREAM",
      targetType,
      visibility: null,
    };
  }

  return {
    language,
    normalizedText: text,
    command: null,
    targetType: null,
    visibility: null,
  };
}

function inferProjectVisibility(text: string) {
  if (/\b(hidden|hide|oculto|ocultar|esconder)\b/.test(text)) return "HIDDEN";
  if (/\b(detailed|detail|detallado|detalle)\b/.test(text)) return "DETAILED";
  if (/\b(both|ambos)\b/.test(text)) return "BOTH";
  if (/\b(executive|ejecutivo)\b/.test(text)) return "EXECUTIVE";
  return "DETAILED";
}

function tokenize(value: string) {
  return normalizeNaturalLanguage(value)
    .split(" ")
    .filter((token) => token.length > 1 && !ignoredTokens.has(token));
}

function scoreRecord(inputTokens: string[], record: MatchableRecord) {
  const normalizedInput = inputTokens.join(" ");
  const searchable = normalizeNaturalLanguage(record.label);
  let score = 0;

  for (const token of inputTokens) {
    if (searchable === token) score += 8;
    else if (searchable.includes(` ${token} `)) score += 4;
    else if (searchable.includes(token)) score += 2;
  }

  const normalizedLabel = normalizeNaturalLanguage(record.label);
  if (normalizedLabel && normalizedInput.includes(normalizedLabel)) score += 10;

  for (const alias of record.aliases ?? []) {
    const normalizedAlias = normalizeNaturalLanguage(alias);
    if (!normalizedAlias) continue;

    const aliasTokens = tokenize(normalizedAlias);
    if (normalizedInput.includes(normalizedAlias)) {
      score += Math.max(8, aliasTokens.length * 5);
      continue;
    }

    const matchedAliasTokens = aliasTokens.filter((token) =>
      inputTokens.includes(token)
    );
    if (aliasTokens.length > 1 && matchedAliasTokens.length === aliasTokens.length) {
      score += aliasTokens.length * 4;
    }
  }

  return score;
}

export function extractPhaseReference(rawInstruction: string) {
  const text = normalizeNaturalLanguage(rawInstruction);
  const match = text.match(/\b(phase|fase)\s+([0-9]+)\b/);
  return match?.[2] ?? null;
}

export function rankNaturalLanguageCandidates(
  rawInstruction: string,
  records: MatchableRecord[]
) {
  const inputTokens = tokenize(rawInstruction);

  return records
    .map((record) => ({
      id: record.id,
      label: record.label,
      score: scoreRecord(inputTokens, record),
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, 5);
}

export function getCandidateConfidence(
  candidates: NaturalLanguageMatchCandidate[]
): "HIGH" | "MEDIUM" | "LOW" {
  const best = candidates[0];
  const second = candidates[1];
  if (!best || best.score < 3) return "LOW";
  if (!second || best.score >= second.score + 4) return "HIGH";
  return "MEDIUM";
}

export function buildStartWorkSessionUnderstanding(input: {
  rawInstruction: string;
  projectLabel: string;
  projectWorkstreamLabel: string;
  taskFamilyLabel: string;
  projectTaskLabel?: string | null;
}) {
  return `Understood: start time tracking for ${input.projectLabel} / ${input.projectWorkstreamLabel}${input.projectTaskLabel ? ` / ${input.projectTaskLabel}` : ""}. Task family: ${input.taskFamilyLabel}. Start now?`;
}
