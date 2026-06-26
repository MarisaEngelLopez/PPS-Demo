export type TaskFamilyActionResult = {
  ok: boolean;
  message: string;
};

export type TaskFamilyAdminRow = {
  id: string;
  code: string;
  name: string;
  nameEs: string | null;
  sortOrder: number;
  isActive: boolean;
  timeEntryCount: number;
};
