"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthorizationContext, hasRole } from "@/lib/authorization";
import {
  isSelectableWorkspaceCode,
  workspaceCookieName,
} from "@/lib/workspaceContext";

export async function switchWorkspace(formData: FormData) {
  const context = await getAuthorizationContext();

  if (!context || !hasRole(context, "OWNER_ADMIN")) {
    redirect("/login?next=/");
  }

  const code = String(formData.get("workspaceCode") || "");
  const nextPath = String(formData.get("nextPath") || "/");

  if (!isSelectableWorkspaceCode(code)) {
    redirect(nextPath.startsWith("/") ? nextPath : "/");
  }

  const cookieStore = await cookies();
  cookieStore.set(workspaceCookieName, code, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  revalidatePath("/", "layout");
  redirect(nextPath.startsWith("/") ? nextPath : "/");
}
