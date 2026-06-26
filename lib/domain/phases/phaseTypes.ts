export type PhaseActionResult = {
  ok: boolean;
  message: string;
};

export type PhaseAdminRow = {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  workstreamCount: number;
};
