import type { ReactNode } from "react";

import { AccessDenied } from "@/components/auth/AccessDenied";
import { requireOwnerAdmin } from "@/lib/authorization";

export default async function ConfigurationLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { authorized, context } = await requireOwnerAdmin("/configuration");

  if (!authorized) {
    return (
      <AccessDenied email={context.authUser.email} section="Configuration" />
    );
  }

  return children;
}
