import { cookies } from "next/headers";

import {
  getAuthorizationContext,
  hasRole,
  hasWorkspaceMembership,
} from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export const workspaceCookieName = "pps_workspace_code";
export const defaultWorkspaceCode = "LIVE";
export const selectableWorkspaceCodes = ["LIVE", "DEMO"] as const;

export type SelectableWorkspaceCode = (typeof selectableWorkspaceCodes)[number];

export function isSelectableWorkspaceCode(
  value: string,
): value is SelectableWorkspaceCode {
  return selectableWorkspaceCodes.includes(value as SelectableWorkspaceCode);
}

export async function getSelectedWorkspaceCode() {
  const context = await getAuthorizationContext();
  if (context && !hasRole(context, "OWNER_ADMIN")) {
    if (hasWorkspaceMembership(context, "DEMO")) return "DEMO";
    if (hasWorkspaceMembership(context, "LIVE")) return "LIVE";
  }

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(workspaceCookieName)?.value;

  return cookieValue && isSelectableWorkspaceCode(cookieValue)
    ? cookieValue
    : defaultWorkspaceCode;
}

export async function getSelectedWorkspace() {
  const code = await getSelectedWorkspaceCode();
  const workspace = await prisma.workspace.findUnique({
    where: { code },
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
    },
  });

  if (workspace) return workspace;

  return prisma.workspace.findUniqueOrThrow({
    where: { code: defaultWorkspaceCode },
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
    },
  });
}

export async function getSelectableWorkspaces() {
  return prisma.workspace.findMany({
    where: {
      code: { in: [...selectableWorkspaceCodes] },
      isActive: true,
    },
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
    },
  });
}
