import Link from "next/link";

import { h1Style, pageStyle } from "@/components/ui/layoutStyles";

export function AccessDenied({
  email,
  section,
}: {
  email: string;
  section: string;
}) {
  return (
    <main style={pageStyle}>
      <h1 style={h1Style}>Access restricted</h1>
      <p style={{ color: "#475569", maxWidth: 760 }}>
        {email} is signed in, but this section requires owner administrator
        access.
      </p>
      <p style={{ color: "#64748b", maxWidth: 760 }}>
        Section: {section}
      </p>
      <Link
        href="/"
        style={{
          color: "#2563eb",
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        Return home
      </Link>
    </main>
  );
}
