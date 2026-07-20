import { LoginForm } from "@/app/login/LoginForm";
import { EnvironmentBadge } from "@/components/ui/EnvironmentBadge";
import { h1Style, pageStyle } from "@/components/ui/layoutStyles";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/");
  }

  return (
    <main style={pageStyle}>
      <div style={{ display: "grid", gap: "0.75rem", maxWidth: 620 }}>
        <EnvironmentBadge />
        <h1 style={h1Style}>Sign in</h1>
        <p style={{ color: "#475569", fontSize: "1rem", margin: 0 }}>
          Use your Project Operations account for this environment.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
