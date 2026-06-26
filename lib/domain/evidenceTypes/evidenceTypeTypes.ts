export type EvidenceTypeActionResult = {
  ok: boolean;
  message: string;
};

export type EvidenceTypeAdminRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  evidenceCount: number;
};
