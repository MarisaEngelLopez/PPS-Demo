"use client";

import { normalizeNaturalLanguage } from "@/lib/domain/agents/naturalLanguageInterpreter";

export type VoiceCommandIntent = "APPLY" | "CANCEL" | null;

const applyPhrases = new Set([
  "apply",
  "approve",
  "confirm",
  "yes",
  "yes apply",
  "yes save it",
  "save it",
  "do it",
  "go ahead",
  "create suggestion",
  "start now",
  "apply now",
  "aplicar",
  "aprueba",
  "aprobar",
  "confirma",
  "confirmar",
  "si",
  "si aplica",
  "si guardar",
  "guardar",
  "hazlo",
  "adelante",
  "crear sugerencia",
]);

const cancelPhrases = new Set([
  "cancel",
  "reject",
  "no",
  "do not apply",
  "dont apply",
  "stop",
  "clear",
  "cancelar",
  "rechazar",
  "no aplicar",
  "no guardar",
  "para",
  "limpiar",
]);

export function detectVoiceCommandIntent(transcript: string): VoiceCommandIntent {
  const text = normalizeNaturalLanguage(transcript);
  if (!text) return null;

  if (applyPhrases.has(text)) return "APPLY";
  if (cancelPhrases.has(text)) return "CANCEL";

  if (/^(yes|si|ok|okay)\b.*\b(apply|aplicar|save|guardar|confirm|confirmar|approve|aprobar)\b/.test(text)) {
    return "APPLY";
  }
  if (/^(no|cancel|cancelar)\b/.test(text)) return "CANCEL";

  return null;
}
