import type { ReactNode } from "react";

import { AccessDenied } from "@/components/auth/AccessDenied";
import { requireOwnerAdmin } from "@/lib/authorization";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { authorized, context } = await requireOwnerAdmin("/admin");

  if (!authorized) {
    return <AccessDenied email={context.authUser.email} section="Admin" />;
  }

  return children;
}
