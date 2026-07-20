"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSelectedWorkspace } from "@/lib/workspaceContext";

export type OrganizationActionResult = {
  ok: boolean;
  message: string;
};

function ok(message: string): OrganizationActionResult {
  return { ok: true, message };
}

function error(message: string): OrganizationActionResult {
  return { ok: false, message };
}

function textOrNull(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  return text === "" ? null : text;
}

function boolFromForm(value: FormDataEntryValue | null) {
  return String(value || "") === "true";
}

async function organizationInSelectedWorkspace(id: string) {
  const selectedWorkspace = await getSelectedWorkspace();
  return prisma.organization.findFirst({
    where: { id, workspaceId: selectedWorkspace.id },
    select: { id: true },
  });
}

async function contactInSelectedWorkspace(id: string) {
  const selectedWorkspace = await getSelectedWorkspace();
  return prisma.organizationContact.findFirst({
    where: {
      id,
      organization: { workspaceId: selectedWorkspace.id },
    },
    select: { id: true },
  });
}

export async function createOrganization(formData: FormData) {
  const name = String(formData.get("name") || "").trim();

  if (!name) return error("Organization not created: name is required.");

  try {
    const selectedWorkspace = await getSelectedWorkspace();

    await prisma.organization.create({
      data: {
        workspaceId: selectedWorkspace.id,
        code: textOrNull(formData.get("code")),
        name,
        legalName: textOrNull(formData.get("legalName")),
        displayName: textOrNull(formData.get("displayName")),
        logoUrl: textOrNull(formData.get("logoUrl")),
        website: textOrNull(formData.get("website")),
        industry: textOrNull(formData.get("industry")),
        country: textOrNull(formData.get("country")),
        organizationType: textOrNull(formData.get("organizationType")),
        notes: textOrNull(formData.get("notes")),
        isActive: true,
      },
    });

    revalidatePath("/organizations");
    return ok("Organization created successfully.");
  } catch (err) {
    return error(
      `Organization not created: ${err instanceof Error ? err.message : "unexpected error."}`
    );
  }
}

export async function updateOrganization(formData: FormData) {
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();

  if (!id || !name) return error("Organization not updated: missing id or name.");

  try {
    const organization = await organizationInSelectedWorkspace(id);
    if (!organization) {
      return error("Organization not updated: it is not in the selected workspace.");
    }

    await prisma.organization.update({
      where: { id },
      data: {
        code: textOrNull(formData.get("code")),
        name,
        legalName: textOrNull(formData.get("legalName")),
        displayName: textOrNull(formData.get("displayName")),
        logoUrl: textOrNull(formData.get("logoUrl")),
        website: textOrNull(formData.get("website")),
        industry: textOrNull(formData.get("industry")),
        country: textOrNull(formData.get("country")),
        organizationType: textOrNull(formData.get("organizationType")),
        notes: textOrNull(formData.get("notes")),
        isActive: boolFromForm(formData.get("isActive")),
      },
    });

    revalidatePath("/organizations");
    return ok("Organization updated successfully.");
  } catch (err) {
    return error(
      `Organization not updated: ${err instanceof Error ? err.message : "unexpected error."}`
    );
  }
}

export async function deleteOrganization(formData: FormData) {
  const id = String(formData.get("id") || "");

  if (!id) return error("Organization not deleted: missing id.");

  try {
    const selectedWorkspace = await getSelectedWorkspace();
    const organization = await prisma.organization.findFirst({
      where: { id, workspaceId: selectedWorkspace.id },
      include: {
        _count: {
          select: {
            contacts: true,
            issuerProjects: true,
            clientProjects: true,
            deliveryProjects: true,
          },
        },
      },
    });

    if (!organization) return error("Organization not deleted: not found.");

    const references =
      organization._count.contacts +
      organization._count.issuerProjects +
      organization._count.clientProjects +
      organization._count.deliveryProjects;

    if (references > 0) {
      return error(
        "Organization not deleted: it has contacts or project references. Deactivate it instead."
      );
    }

    await prisma.organization.delete({ where: { id } });
    revalidatePath("/organizations");
    return ok("Organization deleted successfully.");
  } catch (err) {
    return error(
      `Organization not deleted: ${err instanceof Error ? err.message : "unexpected error."}`
    );
  }
}

export async function createOrganizationContact(formData: FormData) {
  const organizationId = String(formData.get("organizationId") || "");
  const name = String(formData.get("name") || "").trim();

  if (!organizationId || !name) return error("Contact not created: organization and name are required.");

  try {
    const organization = await organizationInSelectedWorkspace(organizationId);
    if (!organization) {
      return error("Contact not created: organization is not in the selected workspace.");
    }

    await prisma.organizationContact.create({
      data: {
        organizationId,
        name,
        roleTitle: textOrNull(formData.get("roleTitle")),
        email: textOrNull(formData.get("email")),
        phone: textOrNull(formData.get("phone")),
        notes: textOrNull(formData.get("notes")),
        isSponsor: boolFromForm(formData.get("isSponsor")),
        isActive: true,
      },
    });

    revalidatePath("/organizations");
    return ok("Contact created successfully.");
  } catch (err) {
    return error(
      `Contact not created: ${err instanceof Error ? err.message : "unexpected error."}`
    );
  }
}

export async function updateOrganizationContact(formData: FormData) {
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();

  if (!id || !name) return error("Contact not updated: missing id or name.");

  try {
    const contact = await contactInSelectedWorkspace(id);
    if (!contact) {
      return error("Contact not updated: it is not in the selected workspace.");
    }

    await prisma.organizationContact.update({
      where: { id },
      data: {
        name,
        roleTitle: textOrNull(formData.get("roleTitle")),
        email: textOrNull(formData.get("email")),
        phone: textOrNull(formData.get("phone")),
        notes: textOrNull(formData.get("notes")),
        isSponsor: boolFromForm(formData.get("isSponsor")),
        isActive: boolFromForm(formData.get("isActive")),
      },
    });

    revalidatePath("/organizations");
    return ok("Contact updated successfully.");
  } catch (err) {
    return error(
      `Contact not updated: ${err instanceof Error ? err.message : "unexpected error."}`
    );
  }
}

export async function deleteOrganizationContact(formData: FormData) {
  const id = String(formData.get("id") || "");

  if (!id) return error("Contact not deleted: missing id.");

  try {
    const selectedWorkspace = await getSelectedWorkspace();
    const contact = await prisma.organizationContact.findFirst({
      where: {
        id,
        organization: { workspaceId: selectedWorkspace.id },
      },
      include: {
        _count: {
          select: {
            managedProjects: true,
            sponsoredProjects: true,
          },
        },
      },
    });

    if (!contact) return error("Contact not deleted: not found.");

    if (contact._count.managedProjects + contact._count.sponsoredProjects > 0) {
      return error(
        "Contact not deleted: it is used in project manager or sponsor fields. Deactivate it instead."
      );
    }

    await prisma.organizationContact.delete({
      where: { id },
    });

    revalidatePath("/organizations");
    return ok("Contact deleted successfully.");
  } catch (err) {
    return error(
      `Contact not deleted: ${err instanceof Error ? err.message : "unexpected error."}`
    );
  }
}
