export type WorkstreamActionResult = {
  ok: boolean;
  message: string;
};

export type WorkstreamPhaseOption = {
  id: string;
  name: string;
};

export type WorkstreamAdminRow = {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  phaseId: string;
  phase: WorkstreamPhaseOption | null;
  projectWorkstreamCount: number;
  templateWorkstreamCount: number;
};
