"use client";

import { useRef, useState } from "react";
import { useTranslation } from "@/components/i18n/TranslationProvider";
import { tableButtonStyle } from "@/components/ui/layoutStyles";

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult:
    | ((
        event: {
          resultIndex?: number;
          results: ArrayLike<{ 0: { transcript: string }; isFinal?: boolean }>;
        }
      ) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

export function VoiceInputControl({
  enabled,
  onTranscript,
  onInstructionEnd,
}: {
  enabled: boolean;
  onTranscript: (transcript: string) => void;
  onInstructionEnd?: (transcript: string) => void;
}) {
  const { t, locale } = useTranslation();
  const [voiceStatus, setVoiceStatus] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTranscriptRef = useRef("");

  if (!enabled) return null;

  function stopVoiceCapture(status = t("timeTracking.voiceStopped")) {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    setVoiceStatus(status);
  }

  function splitInstructionAtEnd(transcript: string) {
    const match = transcript.match(/\b(end|over|fin)\b/i);
    if (!match || match.index === undefined) return null;

    return transcript.slice(0, match.index).trim();
  }

  function startVoiceCapture() {
    setVoiceStatus(t("timeTracking.voiceCheckingSupport"));

    if (isListening) {
      stopVoiceCapture();
      return;
    }

    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setVoiceStatus(
        t("timeTracking.voiceUnsupported")
      );
      return;
    }

    const recognition = new Recognition();
    finalTranscriptRef.current = "";
    recognition.lang = locale === "es" ? "es-ES" : "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      let interimTranscript = "";
      const startIndex = event.resultIndex ?? 0;

      for (let index = startIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const resultTranscript = result[0]?.transcript?.trim() ?? "";
        if (!resultTranscript) continue;

        if (result.isFinal) {
          finalTranscriptRef.current = `${finalTranscriptRef.current} ${resultTranscript}`.trim();
        } else {
          interimTranscript = `${interimTranscript} ${resultTranscript}`.trim();
        }
      }

      const transcript = `${finalTranscriptRef.current} ${interimTranscript}`.trim();
      if (transcript) {
        const finalInstruction = splitInstructionAtEnd(transcript);

        if (finalInstruction !== null) {
          onTranscript(finalInstruction);
          stopVoiceCapture(t("timeTracking.voiceEndDetected"));
          onInstructionEnd?.(finalInstruction);
          return;
        }

        onTranscript(transcript);
        setVoiceStatus(t("timeTracking.voiceListening"));
      }
    };
    recognition.onerror = (event) => {
      setVoiceStatus(t("timeTracking.voiceError").replace("{error}", event.error));
      setIsListening(false);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setVoiceStatus(t("timeTracking.voiceListening"));
    setIsListening(true);
    recognition.start();
  }

  return (
    <>
      <button type="button" onClick={startVoiceCapture} style={tableButtonStyle}>
        {isListening ? t("actions.stopListening") : t("actions.voiceInput")}
      </button>
      {voiceStatus && (
        <span style={{ color: "#475569", fontSize: "0.82rem" }}>
          {voiceStatus}
        </span>
      )}
    </>
  );
}
