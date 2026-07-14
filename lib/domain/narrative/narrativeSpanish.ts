import type { LanguageCode } from "@prisma/client";

const EXACT_TRANSLATIONS = new Map<string, string>([
  ["architecture hardening", "Refuerzo de arquitectura"],
  ["mobile function", "Función móvil"],
  ["mobile testing", "Pruebas móviles"],
  ["multilingual md strategy", "Estrategia de datos maestros multilingüe"],
  ["multilingual reports and agents", "Informes y agentes multilingües"],
  ["multilingual ui", "Interfaz multilingüe"],
  ["narrative business objects", "Objetos de negocio narrativos"],
  ["project management", "Gestión del proyecto"],
  ["testing voice response", "Pruebas de respuesta por voz"],
  ["add open sessions tab and voice agent", "Incorporación de la pestaña de sesiones abiertas y del agente de voz"],
  ["adaptations to mobile", "Adaptaciones para móvil"],
  ["design a new architecture for narrative business objects", "Diseño de una nueva arquitectura para los objetos de negocio narrativos"],
  ["change endless scrolls to tabs", "Sustitución del desplazamiento continuo por pestañas"],
  ["finish translation", "Finalización de la traducción"],
  ["correct language instruction spanish", "Corrección de las instrucciones de idioma en español"],
  ["test language mobile", "Pruebas del idioma en móvil"],
  ["test generation en ok, spanish nok, appears in report", "Generación en inglés correcta; generación en español incorrecta; aparecen títulos en español en el informe"],
]);

export function localizeNarrativeEvidenceText(
  value: string,
  language: LanguageCode
) {
  if (language !== "ES") return value;
  const trimmed = value.trim();
  const exact = EXACT_TRANSLATIONS.get(trimmed.toLowerCase().replace(/[.]$/, ""));
  if (exact) return exact;

  return trimmed
    .replace(/^testing\s+/i, "Pruebas de ")
    .replace(/^test\s+/i, "Prueba de ")
    .replace(/^add\s+/i, "Incorporación de ")
    .replace(/^implemented\s+/i, "Implementación de ")
    .replace(/^implement\s+/i, "Implementación de ")
    .replace(/^design(?:ed)?\s+/i, "Diseño de ")
    .replace(/^finish(?:ed)?\s+/i, "Finalización de ")
    .replace(/^adjust(?:ed)?\s+/i, "Ajuste de ")
    .replace(/^create(?:d|ing)?\s+/i, "Creación de ")
    .replace(/^continue\s+/i, "Continuación de ")
    .replace(/\bvoice\b/gi, "voz")
    .replace(/\bmobile\b/gi, "móvil")
    .replace(/\btranslation\b/gi, "traducción")
    .replace(/\bagents?\b/gi, (match) =>
      match.toLowerCase().endsWith("s") ? "agentes" : "agente"
    );
}

export function localizeHealthStatus(value: string, language: LanguageCode) {
  if (language !== "ES") return value.toUpperCase();
  return (
    {
      GREEN: "VERDE",
      AMBER: "ÁMBAR",
      RED: "ROJO",
    }[value.toUpperCase()] ?? value.toUpperCase()
  );
}
