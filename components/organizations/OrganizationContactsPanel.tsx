"use client";

import {
  TranslatedButtonLabel,
  TranslatedText,
} from "@/components/ui/TranslatedControls";
import { useState } from "react";
import { AddActionButton } from "@/components/ui/AddActionButton";
import { NestedTablePanel } from "@/components/ui/NestedTablePanel";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { inputStyle, tableButtonStyle } from "@/components/ui/layoutStyles";
import {
  StandardTable,
  TableActionGroup,
  TableEmptyRow,
} from "@/components/ui/TablePrimitives";
import { tdStyle, thStyle } from "@/components/ui/tableStyles";

type ClientActionHandler = (formData: FormData) => Promise<void>;

type ContactRowData = {
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

type OrganizationWithContacts = {
  id: string;
  name: string;
  displayName: string | null;
  contacts: ContactRowData[];
};

export function OrganizationContactsPanel({
  organization,
  createOrganizationContact,
  updateOrganizationContact,
  deleteOrganizationContact,
}: {
  organization: OrganizationWithContacts;
  createOrganizationContact: ClientActionHandler;
  updateOrganizationContact: ClientActionHandler;
  deleteOrganizationContact: ClientActionHandler;
}) {
  const [isCreating, setIsCreating] = useState(false);

  return (
    <NestedTablePanel>
      <SectionHeader
        title={
          <>
            <TranslatedText labelKey="sections.contacts" /> -{" "}
            {organization.displayName || organization.name}
          </>
        }
        action={
          <AddActionButton
            onClick={() => setIsCreating(true)}
            labelKey="actions.addContact"
          />
        }
      />

      <StandardTable style={{ marginTop: "0.5rem", background: "#ffffff" }}>
        <thead>
          <tr>
            <th style={thStyle}><TranslatedText labelKey="labels.name" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.role" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.email" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.phone" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.sponsor" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.active" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.notes" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.actions" /></th>
          </tr>
        </thead>
        <tbody>
          {isCreating && (
            <CreateContactRow
              organization={organization}
              createOrganizationContact={createOrganizationContact}
              onCancel={() => setIsCreating(false)}
            />
          )}

          {organization.contacts.map((contact) => (
            <ContactRow
              key={contact.id}
              contact={contact}
              updateOrganizationContact={updateOrganizationContact}
              deleteOrganizationContact={deleteOrganizationContact}
            />
          ))}

          {organization.contacts.length === 0 && !isCreating && (
            <TableEmptyRow colSpan={8}>
              <TranslatedText labelKey="empty.noContacts" />
            </TableEmptyRow>
          )}
        </tbody>
      </StandardTable>
    </NestedTablePanel>
  );
}

function CreateContactRow({
  organization,
  createOrganizationContact,
  onCancel,
}: {
  organization: OrganizationWithContacts;
  createOrganizationContact: ClientActionHandler;
  onCancel: () => void;
}) {
  const formId = `create-contact-${organization.id}`;

  return (
    <tr>
      <td style={tdStyle}>
        <form id={formId} action={createOrganizationContact}>
          <input type="hidden" name="organizationId" value={organization.id} />
        </form>
        <input form={formId} name="name" required placeholder="Name" style={{ ...inputStyle, marginTop: 0 }} />
      </td>
      <td style={tdStyle}><input form={formId} name="roleTitle" placeholder="Role" style={{ ...inputStyle, marginTop: 0 }} /></td>
      <td style={tdStyle}><input form={formId} name="email" placeholder="Email" style={{ ...inputStyle, marginTop: 0 }} /></td>
      <td style={tdStyle}><input form={formId} name="phone" placeholder="Phone" style={{ ...inputStyle, marginTop: 0 }} /></td>
      <td style={tdStyle}><input form={formId} type="checkbox" name="isSponsor" value="true" /></td>
      <td style={tdStyle}><TranslatedText labelKey="labels.yes" /></td>
      <td style={tdStyle}><input form={formId} name="notes" placeholder="Notes" style={{ ...inputStyle, marginTop: 0 }} /></td>
      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
        <TableActionGroup>
          <button form={formId} type="submit" style={tableButtonStyle}><TranslatedButtonLabel labelKey="actions.save" /></button>
          <button type="button" style={tableButtonStyle} onClick={onCancel}><TranslatedButtonLabel labelKey="actions.cancel" /></button>
        </TableActionGroup>
      </td>
    </tr>
  );
}

function ContactRow({
  contact,
  updateOrganizationContact,
  deleteOrganizationContact,
}: {
  contact: ContactRowData;
  updateOrganizationContact: ClientActionHandler;
  deleteOrganizationContact: ClientActionHandler;
}) {
  const [name, setName] = useState(contact.name ?? "");
  const [roleTitle, setRoleTitle] = useState(contact.roleTitle ?? "");
  const [email, setEmail] = useState(contact.email ?? "");
  const [phone, setPhone] = useState(contact.phone ?? "");
  const [notes, setNotes] = useState(contact.notes ?? "");
  const [isSponsor, setIsSponsor] = useState(Boolean(contact.isSponsor));
  const [isActive, setIsActive] = useState(Boolean(contact.isActive));
  const canDelete =
    (contact._count?.managedProjects ?? 0) +
      (contact._count?.sponsoredProjects ?? 0) ===
    0;

  return (
    <tr>
      <td style={tdStyle}><input value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, marginTop: 0 }} /></td>
      <td style={tdStyle}><input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} style={{ ...inputStyle, marginTop: 0 }} /></td>
      <td style={tdStyle}><input value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...inputStyle, marginTop: 0 }} /></td>
      <td style={tdStyle}><input value={phone} onChange={(e) => setPhone(e.target.value)} style={{ ...inputStyle, marginTop: 0 }} /></td>
      <td style={tdStyle}><input type="checkbox" checked={isSponsor} onChange={(e) => setIsSponsor(e.target.checked)} /></td>
      <td style={tdStyle}><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /></td>
      <td style={tdStyle}><input value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...inputStyle, marginTop: 0 }} /></td>
      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
        <TableActionGroup>
          <form action={updateOrganizationContact} style={{ margin: 0 }}>
            <input type="hidden" name="id" value={contact.id} />
            <input type="hidden" name="name" value={name} />
            <input type="hidden" name="roleTitle" value={roleTitle} />
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="phone" value={phone} />
            <input type="hidden" name="notes" value={notes} />
            <input type="hidden" name="isSponsor" value={isSponsor ? "true" : ""} />
            <input type="hidden" name="isActive" value={isActive ? "true" : ""} />
            <button type="submit" style={tableButtonStyle}><TranslatedButtonLabel labelKey="actions.save" /></button>
          </form>

          {canDelete && (
            <form action={deleteOrganizationContact} style={{ margin: 0 }}>
              <input type="hidden" name="id" value={contact.id} />
              <button type="submit" style={tableButtonStyle}><TranslatedButtonLabel labelKey="actions.delete" /></button>
            </form>
          )}
        </TableActionGroup>
      </td>
    </tr>
  );
}
