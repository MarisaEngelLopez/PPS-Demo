import type { HealthStatus, ProjectCadence } from "@prisma/client";

export type ProjectActionResult = {
  ok: boolean;
  message: string;
};

export type ParsedProjectHeaderInput = {
  id: string;
  name: string;
  governedStatusId: string;
  projectManagerContactId: string;
  healthStatus: HealthStatus;
  reportingCadence: ProjectCadence;
  startDate: Date | null;
  plannedStartDate: Date | null;
  plannedEndDate: Date | null;
  actualStartDate: Date | null;
  actualEndDate: Date | null;
  issuerOrganizationId: string | null;
  clientOrganizationId: string | null;
  deliveryOrganizationId: string | null;
  sponsorContactId: string | null;
  showIssuerLogo: boolean;
  showClientLogo: boolean;
  showDeliveryLogo: boolean;
};

export type ParsedProjectCreateInput = {
  name: string;
  projectTypeId: string | null;
  governedStatusId: string;
  projectManagerContactId: string;
  templateId: string;
  startDate: Date;
};
