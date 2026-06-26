"use client";

import { TranslatedButtonLabel, TranslatedText } from "@/components/ui/TranslatedControls";
import { useState, type FormEvent } from "react";
import { useActionToast } from "@/components/ui/useActionToast";
import { AddActionButton } from "@/components/ui/AddActionButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { inputStyle, labelStyle, tableButtonStyle } from "@/components/ui/layoutStyles";
import {
  StandardTable,
  TableActionGroup,
  TableEmptyRow,
} from "@/components/ui/TablePrimitives";
import { tdStyle, thStyle } from "@/components/ui/tableStyles";
import { OrganizationContactsPanel } from "./OrganizationContactsPanel";
import type { OrganizationActionResult } from "@/app/organizations/actions";

const ORGANIZATION_TYPES = ["ISSUER", "CLIENT", "DELIVERY", "PARTNER", "INTERNAL"];

type ActionHandler = (
  formData: FormData
) => Promise<OrganizationActionResult | undefined>;
type ClientActionHandler = (formData: FormData) => Promise<void>;

type OrganizationContactRow = {
  id: string;
  name: string;
  roleTitle: string | null;
  email: string | null;
  phone: string | null;
  isSponsor: boolean;
  notes: string | null;
  isActive: boolean;
  _count?: {
    managedProjects: number;
    sponsoredProjects: number;
  };
};

type OrganizationRowData = {
  id: string;
  code: string | null;
  name: string;
  legalName: string | null;
  displayName: string | null;
  logoUrl: string | null;
  website: string | null;
  industry: string | null;
  country: string | null;
  organizationType: string | null;
  notes: string | null;
  isActive: boolean;
  contacts: OrganizationContactRow[];
  _count?: {
    contacts: number;
    issuerProjects: number;
    clientProjects: number;
    deliveryProjects: number;
  };
};

type OrganizationsTableProps = {
  organizations: OrganizationRowData[];
  createOrganization: ActionHandler;
  updateOrganization: ActionHandler;
  deleteOrganization: ActionHandler;
  createOrganizationContact: ActionHandler;
  updateOrganizationContact: ActionHandler;
  deleteOrganizationContact: ActionHandler;
};

export function OrganizationsTable({
  organizations,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  createOrganizationContact,
  updateOrganizationContact,
  deleteOrganizationContact,
}: OrganizationsTableProps) {
  const [isCreating, setIsCreating] = useState(false);
  const { handleAction } = useActionToast();

  async function handleCreate(formData: FormData) {
    await handleAction(createOrganization, formData, () => setIsCreating(false));
  }

  async function handleUpdate(formData: FormData) {
    await handleAction(updateOrganization, formData);
  }

  async function handleDelete(formData: FormData) {
    await handleAction(deleteOrganization, formData);
  }

  async function handleCreateContact(formData: FormData) {
    await handleAction(createOrganizationContact, formData);
  }

  async function handleUpdateContact(formData: FormData) {
    await handleAction(updateOrganizationContact, formData);
  }

  async function handleDeleteContact(formData: FormData) {
    await handleAction(deleteOrganizationContact, formData);
  }

  return (
    <>
      <SectionHeader
        title="Organizations"
        action={
          <AddActionButton onClick={() => setIsCreating(true)}>
            New Organization
          </AddActionButton>
        }
      />

      <StandardTable>
        <thead>
          <tr>
            <th style={thStyle}><TranslatedText labelKey="labels.code" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.name" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.displayName" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.type" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.country" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.website" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.logoUrl" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.active" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.actions" /></th>
          </tr>
        </thead>
        <tbody>
          {isCreating && (
            <CreateOrganizationRow
              createOrganization={handleCreate}
              onCancel={() => setIsCreating(false)}
            />
          )}

          {organizations.map((organization) => (
            <OrganizationRow
              key={organization.id}
              organization={organization}
              updateOrganization={handleUpdate}
              deleteOrganization={handleDelete}
              createOrganizationContact={handleCreateContact}
              updateOrganizationContact={handleUpdateContact}
              deleteOrganizationContact={handleDeleteContact}
            />
          ))}

          {organizations.length === 0 && !isCreating && (
            <TableEmptyRow colSpan={9}>No organizations found.</TableEmptyRow>
          )}
        </tbody>
      </StandardTable>
    </>
  );
}

function CreateOrganizationRow({
  createOrganization,
  onCancel,
}: {
  createOrganization: ClientActionHandler;
  onCancel: () => void;
}) {
  return (
    <tr>
      <td colSpan={9}>
        <form action={createOrganization} style={{ margin: 0 }}>
          <table style={{ width: "100%" }}>
            <tbody>
              <tr>
                <td style={tdStyle}>
                  <input name="code" placeholder="Code" style={{ ...inputStyle, marginTop: 0 }} />
                </td>
                <td style={tdStyle}>
                  <input name="name" required placeholder="Name" style={{ ...inputStyle, marginTop: 0 }} />
                </td>
                <td style={tdStyle}>
                  <input name="displayName" placeholder="Display name" style={{ ...inputStyle, marginTop: 0 }} />
                </td>
                <td style={tdStyle}>
                  <select name="organizationType" defaultValue="CLIENT" style={{ ...inputStyle, marginTop: 0 }}>
                    {ORGANIZATION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={tdStyle}>
                  <input name="country" placeholder="Country" style={{ ...inputStyle, marginTop: 0 }} />
                </td>
                <td style={tdStyle}>
                  <input name="website" placeholder="Website" style={{ ...inputStyle, marginTop: 0 }} />
                </td>
                <td style={tdStyle}>
                  <input name="logoUrl" placeholder="Logo URL" style={{ ...inputStyle, marginTop: 0 }} />
                </td>
                <td style={tdStyle}>Yes</td>
                <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                  <TableActionGroup>
                    <button type="submit" style={tableButtonStyle}><TranslatedButtonLabel labelKey="actions.save" /></button>
                    <button type="button" style={tableButtonStyle} onClick={onCancel}><TranslatedButtonLabel labelKey="actions.cancel" /></button>
                  </TableActionGroup>
                </td>
              </tr>
              <tr>
                <td style={tdStyle} colSpan={9}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", background: "#f8fafc", padding: "0.75rem", borderRadius: "8px" }}>
                    <div>
                      <div style={labelStyle}>Legal Name</div>
                      <input name="legalName" style={{ ...inputStyle, marginTop: "0.2rem" }} />
                    </div>
                    <div>
                      <div style={labelStyle}>Industry</div>
                      <input name="industry" style={{ ...inputStyle, marginTop: "0.2rem" }} />
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <div style={labelStyle}>Notes</div>
                      <textarea name="notes" style={{ ...inputStyle, minHeight: "42px", marginTop: "0.2rem" }} />
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </form>
      </td>
    </tr>
  );
}

function OrganizationRow({
  organization,
  updateOrganization,
  deleteOrganization,
  createOrganizationContact,
  updateOrganizationContact,
  deleteOrganizationContact,
}: {
  organization: OrganizationRowData;
  updateOrganization: ClientActionHandler;
  deleteOrganization: ClientActionHandler;
  createOrganizationContact: ClientActionHandler;
  updateOrganizationContact: ClientActionHandler;
  deleteOrganizationContact: ClientActionHandler;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [code, setCode] = useState(organization.code ?? "");
  const [name, setName] = useState(organization.name ?? "");
  const [legalName, setLegalName] = useState(organization.legalName ?? "");
  const [displayName, setDisplayName] = useState(organization.displayName ?? "");
  const [logoUrl, setLogoUrl] = useState(organization.logoUrl ?? "");
  const [website, setWebsite] = useState(organization.website ?? "");
  const [industry, setIndustry] = useState(organization.industry ?? "");
  const [country, setCountry] = useState(organization.country ?? "");
  const [organizationType, setOrganizationType] = useState(organization.organizationType ?? "CLIENT");
  const [notes, setNotes] = useState(organization.notes ?? "");
  const [isActive, setIsActive] = useState(Boolean(organization.isActive));

  const referenceCount =
    (organization._count?.contacts ?? 0) +
    (organization._count?.issuerProjects ?? 0) +
    (organization._count?.clientProjects ?? 0) +
    (organization._count?.deliveryProjects ?? 0);
  const canDelete = referenceCount === 0;

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await updateOrganization(new FormData(event.currentTarget));
  }

  return (
    <>
      <tr>
        <td style={tdStyle}><input value={code} onChange={(e) => setCode(e.target.value)} style={{ ...inputStyle, marginTop: 0 }} /></td>
        <td style={tdStyle}><input value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, marginTop: 0 }} /></td>
        <td style={tdStyle}><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={{ ...inputStyle, marginTop: 0 }} /></td>
        <td style={tdStyle}>
          <select value={organizationType} onChange={(e) => setOrganizationType(e.target.value)} style={{ ...inputStyle, marginTop: 0 }}>
            {ORGANIZATION_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </td>
        <td style={tdStyle}><input value={country} onChange={(e) => setCountry(e.target.value)} style={{ ...inputStyle, marginTop: 0 }} /></td>
        <td style={tdStyle}><input value={website} onChange={(e) => setWebsite(e.target.value)} style={{ ...inputStyle, marginTop: 0 }} /></td>
        <td style={tdStyle}><input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} style={{ ...inputStyle, marginTop: 0 }} /></td>
        <td style={tdStyle}>
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        </td>
        <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
          <TableActionGroup>
            <form onSubmit={handleUpdate} style={{ margin: 0 }}>
              <input type="hidden" name="id" value={organization.id} />
              <input type="hidden" name="code" value={code} />
              <input type="hidden" name="name" value={name} />
              <input type="hidden" name="legalName" value={legalName} />
              <input type="hidden" name="displayName" value={displayName} />
              <input type="hidden" name="logoUrl" value={logoUrl} />
              <input type="hidden" name="website" value={website} />
              <input type="hidden" name="industry" value={industry} />
              <input type="hidden" name="country" value={country} />
              <input type="hidden" name="organizationType" value={organizationType} />
              <input type="hidden" name="notes" value={notes} />
              <input type="hidden" name="isActive" value={isActive ? "true" : ""} />
              <button type="submit" style={tableButtonStyle}><TranslatedButtonLabel labelKey="actions.save" /></button>
            </form>
            <button type="button" style={tableButtonStyle} onClick={() => setShowDetails(!showDetails)}>
              <TranslatedButtonLabel
                labelKey={showDetails ? "actions.hideDetails" : "actions.details"}
              />
            </button>
            <button type="button" style={tableButtonStyle} onClick={() => setShowContacts(!showContacts)}>
              <TranslatedButtonLabel
                labelKey={showContacts ? "actions.hideContacts" : "actions.contacts"}
              />
              {!showContacts ? ` (${organization.contacts.length})` : ""}
            </button>
            {canDelete && (
              <form action={deleteOrganization} style={{ margin: 0 }}>
                <input type="hidden" name="id" value={organization.id} />
                <button type="submit" style={tableButtonStyle}><TranslatedButtonLabel labelKey="actions.delete" /></button>
              </form>
            )}
          </TableActionGroup>
        </td>
      </tr>

      {showDetails && (
        <tr>
          <td style={tdStyle} colSpan={9}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 180px", gap: "0.75rem", background: "#f8fafc", padding: "0.75rem", borderRadius: "8px", alignItems: "start" }}>
              <div>
                <div style={labelStyle}>Legal Name</div>
                <input value={legalName} onChange={(e) => setLegalName(e.target.value)} style={{ ...inputStyle, marginTop: "0.2rem" }} />
              </div>
              <div>
                <div style={labelStyle}>Industry</div>
                <input value={industry} onChange={(e) => setIndustry(e.target.value)} style={{ ...inputStyle, marginTop: "0.2rem" }} />
              </div>
              <div>
                <div style={labelStyle}>Logo Preview</div>
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Organization logo preview" style={{ marginTop: "0.2rem", maxWidth: "150px", maxHeight: "60px", objectFit: "contain", border: "1px solid #e2e8f0", background: "#ffffff", padding: "0.25rem" }} />
                ) : (
                  <div style={{ marginTop: "0.2rem", color: "#64748b" }}>No logo URL</div>
                )}
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={labelStyle}>Notes</div>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...inputStyle, minHeight: "42px", marginTop: "0.2rem" }} />
              </div>
            </div>
          </td>
        </tr>
      )}

      {showContacts && (
        <tr>
          <td style={tdStyle} colSpan={9}>
            <OrganizationContactsPanel
              organization={organization}
              createOrganizationContact={createOrganizationContact}
              updateOrganizationContact={updateOrganizationContact}
              deleteOrganizationContact={deleteOrganizationContact}
            />
          </td>
        </tr>
      )}
    </>
  );
}
