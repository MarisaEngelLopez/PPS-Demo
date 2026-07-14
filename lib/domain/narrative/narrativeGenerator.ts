import type { LanguageCode } from "@prisma/client";
import {
  buildTimeEntryEvidenceThemes,
  formatEvidenceThemes,
  type TimeEntryNarrativeEvidence,
} from "@/lib/domain/narrative/narrativeEvidence";
import { localizeHealthStatus } from "@/lib/domain/narrative/narrativeSpanish";

type StatusRef = { code?: string | null; name?: string | null } | null;

type GeneratorProject = {
  name: string;
  healthStatus: string;
  defaultLanguage: LanguageCode;
  projectWorkstreams: Array<{
    customName?: string | null;
    reportingName?: string | null;
    plannedEndDate?: Date | null;
    actualStartDate?: Date | null;
    actualEndDate?: Date | null;
    workstream: { name: string };
  }>;
  events: Array<{
    name: string;
    customName?: string | null;
    reportingName?: string | null;
    eventDate: Date;
    completionDate?: Date | null;
    isCompleted: boolean;
  }>;
  projectRisks: Array<{
    title: string;
    exposure: number;
    escalated: boolean;
    targetResolutionDate?: Date | null;
    status: StatusRef;
  }>;
  projectDecisions: Array<{
    title: string;
    escalated: boolean;
    dueDate?: Date | null;
    statusRef: StatusRef;
  }>;
  timeEntries: TimeEntryNarrativeEvidence[];
};

export type GeneratedReportingPackNarrative = {
  executiveSummary: string;
  achievements: string;
  issues: string;
  nextSteps: string;
  managementAsk: string;
  conclusion: string;
};

function condenseEvidenceLine(value: string) {
  const separator = value.indexOf(":");
  if (separator < 0) return value;
  const label = value.slice(0, separator);
  const firstDetail = value
    .slice(separator + 1)
    .split(";")[0]
    .trim()
    .replace(/[.]$/, "");
  return firstDetail ? `${label}: ${firstDetail}.` : `${label}.`;
}

function condensedLines(value: string, limit: number) {
  return value
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(0, limit)
    .map(condenseEvidenceLine)
    .join("\n");
}

export function generateShortReportingPackNarrative(
  detailed: GeneratedReportingPackNarrative
): GeneratedReportingPackNarrative {
  return {
    executiveSummary: condensedLines(detailed.executiveSummary, 2),
    achievements: condensedLines(detailed.achievements, 3),
    issues: condensedLines(detailed.issues, 2),
    nextSteps: condensedLines(detailed.nextSteps, 3),
    managementAsk: condensedLines(detailed.managementAsk, 2),
    conclusion: condensedLines(detailed.conclusion, 1),
  };
}

function statusCode(status: StatusRef) {
  return (status?.code || status?.name || "").toUpperCase();
}

function isClosed(status: StatusRef) {
  return ["APPROVED", "CANCELLED", "CLOSE", "CLOSED", "COMPLETED", "DONE", "REJECTED"].includes(
    statusCode(status)
  );
}

function workstreamName(workstream: GeneratorProject["projectWorkstreams"][number]) {
  return workstream.reportingName || workstream.customName || workstream.workstream.name;
}

function eventName(event: GeneratorProject["events"][number]) {
  return event.reportingName || event.customName || event.name;
}

function bullet(items: string[], emptyText: string) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : `- ${emptyText}`;
}

function formatDate(value: Date, language: LanguageCode) {
  return new Intl.DateTimeFormat(language === "ES" ? "es-ES" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

export function generateReportingPackNarrative({
  project,
  reportingDate,
  comparisonDate,
}: {
  project: GeneratorProject;
  reportingDate: Date;
  comparisonDate: Date;
}): GeneratedReportingPackNarrative {
  const language = project.defaultLanguage;
  const isSpanish = language === "ES";
  const horizon = new Date(reportingDate);
  horizon.setDate(horizon.getDate() + 30);

  const completedWorkstreams = project.projectWorkstreams.filter((item) => item.actualEndDate);
  const inProgressWorkstreams = project.projectWorkstreams.filter(
    (item) => item.actualStartDate && !item.actualEndDate
  );
  const overdueWorkstreams = project.projectWorkstreams.filter(
    (item) => item.plannedEndDate && !item.actualEndDate && item.plannedEndDate < reportingDate
  );
  const recentEvents = project.events.filter((event) => {
    const completedAt = event.completionDate || event.eventDate;
    return event.isCompleted && completedAt > comparisonDate && completedAt <= reportingDate;
  });
  const upcomingEvents = project.events
    .filter(
      (event) => !event.isCompleted && event.eventDate >= reportingDate && event.eventDate <= horizon
    )
    .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());
  const openRisks = project.projectRisks.filter((risk) => !isClosed(risk.status));
  const attentionRisks = openRisks
    .filter((risk) => risk.escalated || risk.exposure >= 7)
    .sort((a, b) => b.exposure - a.exposure);
  const openDecisions = project.projectDecisions.filter((decision) => !isClosed(decision.statusRef));
  const executiveDecisions = openDecisions.filter((decision) => decision.escalated);
  const evidenceThemes = buildTimeEntryEvidenceThemes({
    entries: project.timeEntries,
    comparisonDate,
    reportingDate,
  });
  const evidenceItems = formatEvidenceThemes(evidenceThemes, "ACHIEVEMENT", 5);
  const evidenceIssues = formatEvidenceThemes(evidenceThemes, "ISSUE", 3);
  const evidenceNextSteps = formatEvidenceThemes(evidenceThemes, "NEXT_STEP", 3);

  const achievementItems = [
    ...evidenceItems,
    ...recentEvents.map((event) =>
      isSpanish
        ? `Finalización de ${eventName(event)} el ${formatDate(event.completionDate || event.eventDate, language)}.`
        : `${eventName(event)} completed on ${formatDate(event.completionDate || event.eventDate, language)}.`
    ),
    ...completedWorkstreams
      .filter((item) => item.actualEndDate && item.actualEndDate > comparisonDate && item.actualEndDate <= reportingDate)
      .map((item) =>
        isSpanish ? `Finalización de ${workstreamName(item)}.` : `${workstreamName(item)} completed.`
      ),
  ].slice(0, 7);

  const issueItems = [
    ...evidenceIssues,
    ...attentionRisks.slice(0, 4).map((risk) =>
      isSpanish
        ? `${risk.title} (exposición ${risk.exposure}${risk.escalated ? ", escalado" : ""}).`
        : `${risk.title} (exposure ${risk.exposure}${risk.escalated ? ", escalated" : ""}).`
    ),
    ...overdueWorkstreams.slice(0, 3).map((item) =>
      isSpanish
        ? `${workstreamName(item)} ha superado su fecha planificada de fin.`
        : `${workstreamName(item)} is past its planned end date.`
    ),
  ].slice(0, 6);

  const nextStepItems = [
    ...evidenceNextSteps,
    ...upcomingEvents.slice(0, 4).map((event) =>
      isSpanish
        ? `${eventName(event)} previsto para el ${formatDate(event.eventDate, language)}.`
        : `${eventName(event)} planned for ${formatDate(event.eventDate, language)}.`
    ),
    ...inProgressWorkstreams.slice(0, 3).map((item) =>
      isSpanish
        ? `Continuar ${workstreamName(item)}.`
        : `Continue ${workstreamName(item)}.`
    ),
  ].slice(0, 6);

  const askItems = [
    ...executiveDecisions.slice(0, 3).map((decision) =>
      isSpanish
        ? `Decisión requerida: ${decision.title}${decision.dueDate ? ` antes del ${formatDate(decision.dueDate, language)}` : ""}.`
        : `Decision required: ${decision.title}${decision.dueDate ? ` by ${formatDate(decision.dueDate, language)}` : ""}.`
    ),
    ...attentionRisks
      .filter((risk) => risk.escalated)
      .slice(0, 3)
      .map((risk) =>
        isSpanish ? `Apoyo ejecutivo requerido para ${risk.title}.` : `Executive support required for ${risk.title}.`
      ),
  ].slice(0, 5);

  const health = localizeHealthStatus(project.healthStatus, language);
  const primaryThemes = evidenceThemes
    .slice(0, 3)
    .map((theme) => theme.label);
  const thematicSummary = primaryThemes.length
    ? isSpanish
      ? `Foco de actividad del periodo: ${primaryThemes.join("; ")}.`
      : `Period activity focus: ${primaryThemes.join("; ")}.`
    : "";
  const governanceSummary = isSpanish
    ? `Situación de gobierno: ${openRisks.length} riesgos abiertos; ${openDecisions.length} decisiones pendientes.`
    : `Governance position: ${openRisks.length} open risks; ${openDecisions.length} pending decisions.`;
  const executiveSummary = isSpanish
    ? [`${project.name} presenta estado ${health}.`, thematicSummary, governanceSummary].filter(Boolean).join("\n")
    : [`${project.name} is ${health}.`, thematicSummary, governanceSummary].filter(Boolean).join("\n");

  const currentFocus = primaryThemes.slice(0, 2);
  const conclusion = currentFocus.length
    ? isSpanish
      ? `Foco actual: ${[
          ...currentFocus,
          ...(attentionRisks.length
            ? [`Seguimiento de ${attentionRisks.length} riesgos relevantes`]
            : []),
        ].join("; ")}.`
      : `Current focus: ${[
          ...currentFocus,
          ...(attentionRisks.length
            ? [`Monitoring ${attentionRisks.length} material risks`]
            : []),
        ].join("; ")}.`
    : isSpanish
    ? attentionRisks.length || overdueWorkstreams.length
      ? `La ejecución continúa, con atención requerida sobre ${attentionRisks.length} riesgos relevantes y ${overdueWorkstreams.length} líneas de trabajo vencidas.`
      : "La ejecución continúa sin asuntos críticos identificados en los datos operativos actuales."
    : attentionRisks.length || overdueWorkstreams.length
      ? `Delivery continues, with attention required on ${attentionRisks.length} material risks and ${overdueWorkstreams.length} overdue workstreams.`
      : "Delivery continues with no critical issues identified in the current operational data.";

  return {
    executiveSummary,
    achievements: bullet(
      achievementItems,
      isSpanish ? "No se registraron logros nuevos desde el informe anterior." : "No new achievements were recorded since the previous report."
    ),
    issues: bullet(
      issueItems,
      isSpanish ? "No se identificaron incidencias relevantes." : "No material issues were identified."
    ),
    nextSteps: bullet(
      nextStepItems,
      isSpanish ? "No hay próximos hitos o líneas de trabajo en curso registrados." : "No upcoming milestones or active workstreams are recorded."
    ),
    managementAsk: bullet(
      askItems,
      isSpanish ? "No se requiere intervención ejecutiva actualmente." : "No executive intervention is currently required."
    ),
    conclusion,
  };
}
