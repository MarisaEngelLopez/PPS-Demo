"use client";

import { useState, type FormEvent } from "react";
import { useActionToast } from "@/components/ui/useActionToast";
import {
  detailGridStyle,
  labelStyle,
  compactInputStyle,
} from "@/components/ui/layoutStyles";
import { TranslatedText } from "@/components/ui/TranslatedControls";
import {
  getConfiguredOptions,
  getProjectHealthOptions,
} from "@/lib/i18n/displayTranslations";
import { useTranslation } from "@/components/i18n/TranslationProvider";

type OrganizationContactOption = {
  id: string;
  name: string;
  roleTitle?: string | null;
};

type OrganizationOption = {
  id: string;
  name: string;
  displayName?: string | null;
  contacts?: OrganizationContactOption[];
};

type ProjectHeaderProject = {
  id: string;
  name: string;
  projectManagerContactId?: string | null;
  issuerOrganizationId?: string | null;
  clientOrganizationId?: string | null;
  deliveryOrganizationId?: string | null;
  sponsorContactId?: string | null;
  governedStatusId?: string | null;
  healthStatus: string;
  reportingCadence: string;
  startDate?: Date | string | null;
  plannedStartDate?: Date | string | null;
  plannedEndDate?: Date | string | null;
  actualStartDate?: Date | string | null;
  actualEndDate?: Date | string | null;
  showIssuerLogo?: boolean | null;
  showClientLogo?: boolean | null;
  showDeliveryLogo?: boolean | null;
};

type ProjectStatusOption = {
  status: {
    id: string;
    code?: string | null;
    name: string;
    nameEs?: string | null;
  };
};

type ProjectHeaderFormProps = {
  project: ProjectHeaderProject;
  projectStatusOptions: ProjectStatusOption[];
  organizations: OrganizationOption[];
  updateProject: (
    formData: FormData
  ) => Promise<{ ok: boolean; message: string } | undefined>;
};

function formatDateInput(value: Date | string | null | undefined) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export function ProjectHeaderForm({
  project,
projectStatusOptions,
  organizations,
  updateProject,
}: ProjectHeaderFormProps) {
  const { handleAction } = useActionToast();
  const { t, locale } = useTranslation();
  const healthOptions = getProjectHealthOptions(t);
  const statusOptions = getConfiguredOptions(
    projectStatusOptions.map((option) => option.status),
    locale,
    t,
    "status"
  );

 async function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  const formData = new FormData(event.currentTarget);
  await handleAction(updateProject, formData);
}

  const startDateValue = formatDateInput(project.startDate);
  const plannedStartDateValue = formatDateInput(project.plannedStartDate);
  const plannedEndDateValue = formatDateInput(project.plannedEndDate);
  const actualStartDateValue = formatDateInput(project.actualStartDate);
  const actualEndDateValue = formatDateInput(project.actualEndDate);

const [issuerOrganizationId, setIssuerOrganizationId] = useState(
  project.issuerOrganizationId || ""
);

const [clientOrganizationId, setClientOrganizationId] = useState(
  project.clientOrganizationId || ""
);

const [deliveryOrganizationId, setDeliveryOrganizationId] = useState(
  project.deliveryOrganizationId || ""
);

const [sponsorContactId, setSponsorContactId] = useState(
  project.sponsorContactId || ""
);

const [projectManagerContactId, setProjectManagerContactId] = useState(
  project.projectManagerContactId || ""
);

const selectedClientOrganization = organizations.find(
  (organization) => organization.id === clientOrganizationId
);

const sponsorContacts = selectedClientOrganization?.contacts ?? [];
const projectManagerContacts = organizations.flatMap((organization) =>
  (organization.contacts ?? []).map((contact) => ({
    ...contact,
    organizationName: organization.displayName || organization.name,
  }))
);

const [showIssuerLogo, setShowIssuerLogo] = useState(
  Boolean(project.showIssuerLogo)
);

const [showClientLogo, setShowClientLogo] = useState(
  Boolean(project.showClientLogo)
);

const [showDeliveryLogo, setShowDeliveryLogo] = useState(
  Boolean(project.showDeliveryLogo)
);


  return (
  <>

    <form id="project-header-form" onSubmit={handleSubmit} style={detailGridStyle}>
      <input type="hidden" name="id" value={project.id} />


      <div style={labelStyle}><TranslatedText labelKey="labels.projectName" /></div>
      <input
        name="name"
        required
        defaultValue={project.name}
        style={compactInputStyle}
        autoComplete="off"
      />

<div style={labelStyle}><TranslatedText labelKey="labels.projectManager" /></div>
<select
  name="projectManagerContactId"
  value={projectManagerContactId}
  onChange={(e) => setProjectManagerContactId(e.target.value)}
  style={compactInputStyle}
  required
>
  <option value="">Select manager</option>
  {projectManagerContacts.map((contact) => (
    <option key={contact.id} value={contact.id}>
      {contact.name}
      {contact.roleTitle ? ` - ${contact.roleTitle}` : ""}
      {contact.organizationName ? ` (${contact.organizationName})` : ""}
    </option>
  ))}
</select>

<div style={labelStyle}><TranslatedText labelKey="labels.issuerOrganization" /></div>

<select
  name="issuerOrganizationId"
  value={issuerOrganizationId}
  onChange={(e) => setIssuerOrganizationId(e.target.value)}
  style={compactInputStyle}
>
  <option value="">No issuer</option>
  {organizations.map((organization) => (
    <option key={organization.id} value={organization.id}>
      {organization.displayName || organization.name}
    </option>
  ))}
</select>

<div style={labelStyle}><TranslatedText labelKey="labels.clientOrganization" /></div>
<select
  name="clientOrganizationId"
  value={clientOrganizationId}
  onChange={(e) => {
    setClientOrganizationId(e.target.value);
    setSponsorContactId("");
  }}
  style={compactInputStyle}
>
  <option value="">No client</option>
  {organizations.map((organization) => (
    <option key={organization.id} value={organization.id}>
      {organization.displayName || organization.name}
    </option>
  ))}
</select>

<div style={labelStyle}><TranslatedText labelKey="labels.deliveryOrganization" /></div>
<select
  name="deliveryOrganizationId"
  value={deliveryOrganizationId}
  onChange={(e) => setDeliveryOrganizationId(e.target.value)}
  style={compactInputStyle}
>
  <option value="">No delivery organization</option>
  {organizations.map((organization) => (
    <option key={organization.id} value={organization.id}>
      {organization.displayName || organization.name}
    </option>
  ))}
</select>


<div style={labelStyle}><TranslatedText labelKey="labels.sponsorContact" /></div>
<select
  name="sponsorContactId"
  value={sponsorContactId}
  onChange={(e) => setSponsorContactId(e.target.value)}
  style={compactInputStyle}
>
  <option value="">No sponsor contact</option>
  {sponsorContacts.map((contact) => (
    <option key={contact.id} value={contact.id}>
      {contact.name}
      {contact.roleTitle ? ` — ${contact.roleTitle}` : ""}
    </option>
  ))}
</select>


<div style={labelStyle}><TranslatedText labelKey="labels.showIssuerLogo" /></div>
<input
  type="checkbox"
  name="showIssuerLogo"
  value="true"
  checked={showIssuerLogo}
  onChange={(e) => setShowIssuerLogo(e.target.checked)}
/>

<div style={labelStyle}><TranslatedText labelKey="labels.showClientLogo" /></div>
<input
  type="checkbox"
  name="showClientLogo"
  value="true"
  checked={showClientLogo}
  onChange={(e) => setShowClientLogo(e.target.checked)}
/>

<div style={labelStyle}><TranslatedText labelKey="labels.showDeliveryLogo" /></div>
<input
  type="checkbox"
  name="showDeliveryLogo"
  value="true"
  checked={showDeliveryLogo}
  onChange={(e) => setShowDeliveryLogo(e.target.checked)}
/>

      <div style={labelStyle}><TranslatedText labelKey="labels.status" /></div>
      <select name="governedStatusId" defaultValue={project.governedStatusId ?? ""}>
  <option value="">Select status</option>
  {statusOptions.map((option) => (
    <option key={option.value} value={option.value}>
      {option.label}
    </option>
  ))}
</select>

      <div style={labelStyle}><TranslatedText labelKey="labels.health" /></div>
      <select
        name="healthStatus"
        defaultValue={project.healthStatus}
        style={compactInputStyle}
      >
        {healthOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <div style={labelStyle}><TranslatedText labelKey="labels.reportingCadence" /></div>
      <select
        name="reportingCadence"
        defaultValue={project.reportingCadence}
        style={compactInputStyle}
      >
        <option value="WEEKLY">Weekly</option>
        <option value="MONTHLY">Monthly</option>
      </select>

      <div style={labelStyle}><TranslatedText labelKey="labels.startDate" /></div>
      <input
        type="date"
        name="startDate"
        defaultValue={startDateValue}
        style={compactInputStyle}
      />

      <div style={labelStyle}><TranslatedText labelKey="labels.plannedStart" /></div>
      <input
        type="date"
        name="plannedStartDate"
        defaultValue={plannedStartDateValue}
        style={compactInputStyle}
      />

      <div style={labelStyle}><TranslatedText labelKey="labels.plannedEnd" /></div>
      <input
        type="date"
        name="plannedEndDate"
        defaultValue={plannedEndDateValue}
        style={compactInputStyle}
      />

      <div style={labelStyle}><TranslatedText labelKey="labels.actualStart" /></div>
      <input
        type="date"
        name="actualStartDate"
        defaultValue={actualStartDateValue}
        style={compactInputStyle}
      />

      <div style={labelStyle}><TranslatedText labelKey="labels.actualEnd" /></div>
      <input
        type="date"
        name="actualEndDate"
        defaultValue={actualEndDateValue}
        style={compactInputStyle}
      />

      <div />

    </form>
  </>
);
}
