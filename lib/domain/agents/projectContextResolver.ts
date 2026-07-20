import {
  projectReferenceAliases,
  rankNaturalLanguageCandidates,
  type NaturalLanguageMatchCandidate,
} from "@/lib/domain/agents/naturalLanguageInterpreter";

type ProjectContextProject = {
  id: string;
  projectCode: string;
  name: string;
};

export type ProjectContextResolution = {
  projectId: string | null;
  candidates: NaturalLanguageMatchCandidate[];
};

export function projectContextLabel(project: ProjectContextProject) {
  return `${project.projectCode} - ${project.name}`;
}

export function resolveProjectContext(input: {
  rawInstruction: string;
  selectedProjectId?: string | null;
  projects: ProjectContextProject[];
  label?: (project: ProjectContextProject) => string;
}): ProjectContextResolution {
  const label = input.label ?? projectContextLabel;
  const candidates = rankNaturalLanguageCandidates(
    input.rawInstruction,
    input.projects.map((project) => ({
      id: project.id,
      label: label(project),
      aliases: projectReferenceAliases(project),
    }))
  );
  const spokenProjectId = candidates[0]?.score >= 4 ? candidates[0].id : null;
  const defaultProjectId = input.projects.some(
    (project) => project.id === input.selectedProjectId
  )
    ? input.selectedProjectId ?? null
    : null;

  return {
    projectId: spokenProjectId ?? defaultProjectId,
    candidates,
  };
}
