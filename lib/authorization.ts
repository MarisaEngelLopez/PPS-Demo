import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type AuthorizationContext = {
  authUser: {
    id: string;
    email: string;
    name: string;
  };
  appUser: {
    id: string;
    email: string;
    fullName: string;
  };
  roles: string[];
  workspaceMemberships: Array<{
    workspaceCode: string;
    roleCode: string;
  }>;
};

export async function getAuthorizationContext(): Promise<AuthorizationContext | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return null;

  const authUser = await prisma.authUser.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      appUser: {
        select: {
          id: true,
          email: true,
          fullName: true,
          workspaceMemberships: {
            where: {
              isActive: true,
              role: { isActive: true },
              workspace: { isActive: true },
            },
            select: {
              role: {
                select: { code: true },
              },
              workspace: {
                select: { code: true },
              },
            },
          },
        },
      },
    },
  });

  if (!authUser?.appUser) return null;

  return {
    authUser: {
      id: authUser.id,
      email: authUser.email,
      name: authUser.name,
    },
    appUser: {
      id: authUser.appUser.id,
      email: authUser.appUser.email,
      fullName: authUser.appUser.fullName,
    },
    roles: authUser.appUser.workspaceMemberships.map(
      (membership) => membership.role.code,
    ),
    workspaceMemberships: authUser.appUser.workspaceMemberships.map((membership) => ({
      workspaceCode: membership.workspace.code,
      roleCode: membership.role.code,
    })),
  };
}

export async function requireAuthorizationContext(nextPath: string) {
  const context = await getAuthorizationContext();

  if (!context) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  return context;
}

export function hasRole(context: AuthorizationContext, roleCode: string) {
  return context.roles.includes(roleCode);
}

export function hasWorkspaceMembership(
  context: AuthorizationContext,
  workspaceCode: string,
) {
  return context.workspaceMemberships.some(
    (membership) => membership.workspaceCode === workspaceCode,
  );
}

export function isDemoOnlyUser(context: AuthorizationContext) {
  return (
    !hasRole(context, "OWNER_ADMIN") &&
    hasWorkspaceMembership(context, "DEMO") &&
    !hasWorkspaceMembership(context, "LIVE")
  );
}

export async function requireOwnerAdmin(nextPath: string) {
  const context = await requireAuthorizationContext(nextPath);

  return {
    context,
    authorized: hasRole(context, "OWNER_ADMIN"),
  };
}
