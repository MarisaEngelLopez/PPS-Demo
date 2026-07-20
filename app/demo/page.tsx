import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DemoLoginForm } from "@/app/demo/DemoLoginForm";
import { auth } from "@/lib/auth";

export default async function DemoPage() {
  const isDemoPackage = process.env.NEXT_PUBLIC_APP_ENV === "DEMO_PACKAGE";
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/projects");
  }

  return (
    <main
      style={{
        alignItems: "center",
        background: "#f8fafc",
        display: "flex",
        flex: "1 1 auto",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "2rem",
      }}
    >
      <section
        style={{
          background: "rgba(255,255,255,0.92)",
          border: "1px solid rgba(148,163,184,0.35)",
          borderRadius: 10,
          boxShadow: "0 20px 70px rgba(15,23,42,0.14)",
          display: "grid",
          gap: "1rem",
          maxWidth: 460,
          padding: "1.35rem",
          width: "100%",
        }}
      >
        <div style={{ display: "grid", gap: "0.35rem" }}>
          <div
            style={{
              color: "#2563eb",
              fontSize: "0.78rem",
              fontWeight: 900,
              letterSpacing: 0,
              textTransform: "uppercase",
            }}
          >
            Project Operations System
          </div>
          <h1
            style={{
              color: "#0f172a",
              fontSize: "2rem",
              lineHeight: 1.05,
              margin: 0,
            }}
          >
            Demo access
          </h1>
          <p style={{ color: "#475569", fontSize: "0.98rem", margin: 0 }}>
            Enter the demo credentials to open the interactive project operations workspace.
          </p>
        </div>

        <DemoLoginForm />

        {!isDemoPackage ? (
          <div
            style={{
              borderTop: "1px solid #e2e8f0",
              paddingTop: "0.85rem",
              textAlign: "center",
            }}
          >
            <Link
              href="/login"
              style={{
                color: "#475569",
                fontSize: "0.86rem",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Owner sign in
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
