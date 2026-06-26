export type ProjectTemplateActionResult = {
  ok: boolean;
  message: string;
};

export type ProjectTemplateAdminRow = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  workstreamCount: number;
};

export type TemplateWorkstreamActionResult = {
  ok: boolean;
  message: string;
};

export type TemplateWorkstreamRow = {
  id: string;
  templateId: string;
  workstreamId: string;
  sortOrder: number;
  plannedOffsetDays: number | null;
  durationDays: number | null;
  workstream: {
    id: string;
    name: string;
    phase: {
      id: string;
      name: string;
    } | null;
  } | null;
};

export type ProjectTemplateDetail = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  templateWorkstreams: TemplateWorkstreamRow[];
};

export type TemplateWorkstreamOption = {
  id: string;
  name: string;
  phase: {
    id: string;
    name: string;
  } | null;
};
