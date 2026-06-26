import type { AppLocale } from "@/lib/i18n/locales";

export type VoiceConfirmationSegment = {
  text: string;
  locale?: AppLocale;
};

export function speakVoiceConfirmation(text: string, locale: AppLocale) {
  speakVoiceConfirmationSegments([{ text }], locale);
}

export function speakVoiceConfirmationSegments(
  segments: VoiceConfirmationSegment[],
  locale: AppLocale
) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  const cleanSegments = segments
    .map((segment) => ({
      text: segment.text.trim(),
      locale: segment.locale ?? locale,
    }))
    .filter((segment) => segment.text);
  if (cleanSegments.length === 0) return;

  window.speechSynthesis.cancel();
  const voices = window.speechSynthesis.getVoices();

  for (const segment of cleanSegments) {
    const utterance = new SpeechSynthesisUtterance(segment.text);
    utterance.lang = segment.locale === "es" ? "es-ES" : "en-US";

    const matchingVoice = voices.find((voice) =>
      voice.lang.toLowerCase().startsWith(segment.locale === "es" ? "es" : "en")
    );
    if (matchingVoice) utterance.voice = matchingVoice;

    window.speechSynthesis.speak(utterance);
  }
}
