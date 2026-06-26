export type EventTypeActionResult = {
  ok: boolean;
  message: string;
};

export type EventTypeAdminRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  milestoneCount: number;
};
