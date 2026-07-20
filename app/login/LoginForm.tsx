"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

type LoginState = "idle" | "submitting";

const inputStyle = {
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  fontSize: "1rem",
  padding: "0.75rem 0.85rem",
  width: "100%",
};

const buttonStyle = {
  background: "#2563eb",
  border: "1px solid #1d4ed8",
  borderRadius: 8,
  color: "white",
  cursor: "pointer",
  fontSize: "0.95rem",
  fontWeight: 700,
  minHeight: 44,
  padding: "0.75rem 1rem",
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const [state, setState] = useState<LoginState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setState("submitting");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    const result = await authClient.signIn.email({
      email,
      password,
    });

    setState("idle");

    if (result.error) {
      setError(result.error.message || "Sign in failed.");
      return;
    }

    router.push(next.startsWith("/") ? next : "/");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "grid",
        gap: "0.85rem",
        maxWidth: 420,
      }}
    >
      <label style={{ display: "grid", gap: "0.35rem", fontWeight: 700 }}>
        Email
        <input
          autoComplete="email"
          name="email"
          required
          style={inputStyle}
          type="email"
        />
      </label>

      <label style={{ display: "grid", gap: "0.35rem", fontWeight: 700 }}>
        Password
        <input
          autoComplete="current-password"
          name="password"
          required
          style={inputStyle}
          type="password"
        />
      </label>

      {error ? (
        <p style={{ color: "#b91c1c", fontSize: "0.9rem", margin: 0 }}>
          {error}
        </p>
      ) : null}

      <button disabled={state === "submitting"} style={buttonStyle} type="submit">
        {state === "submitting" ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
