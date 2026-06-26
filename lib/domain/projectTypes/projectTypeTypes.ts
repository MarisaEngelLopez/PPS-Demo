export type ProjectTypeActionResult = {
  ok: boolean;
  message: string;
};

export type ProjectTypeAdminRow = {
  id: string;
  code: string;
  name: string;
  nameEs: string | null;
  description: string | null;
  descriptionEs: string | null;
  sortOrder: number;
  isActive: boolean;
  projectCount: number;
};
